import "@babel/polyfill"; 

import React, {Component, useState} from 'react'; 
import {BrowserRouter as Router, Switch, Route, Redirect, Link, useHistory} from 'react-router-dom';
import {ipcRenderer, remote} from 'electron';

class App extends Component {
	constructor() {
		super(); 
	}

	render() {
		return (

			<Router>

				<div id="Logo" ></div>
				<p id="title">Quickbase Bulk Document Exporter</p>

				<div>
					<Switch>
						<Route path='/login'>
							<Login />
						</Route>
						<Route path='/tableSelection'>
							<TableSelector />
						</Route>
						<Route path='/'>
							<Redirect to='/login' />
						</Route>
					</Switch>				
				</div>
			</Router>
		);
	}

}

function Login() {
	const [password, setPassword] = useState('');
	const [username, setUsername] = useState('');
	const [domain, setDomain] = useState(''); 
	const [ticket, setTicket] = useState('');
	const [error, setError] = useState(false); 
	const [errormessage, setErrormessage] = useState(0);

	function handleChange(event) {
		switch([event.target.name]+"") {
			case 'password': 
				setPassword([event.target.value]+"")
				break; 
			case 'username':
				setUsername([event.target.value]+""); 
				break;
			case 'domain': 
				setDomain([event.target.value]+""); 
				break; 
		}
	}

	async function getAuth() {
		const res = await ipcRenderer.sendSync('get-authentication', {
			username: username,
			password: password,
			domain: domain
		});

		setTicket(res['authTicket']);
		setError(res['error']);
		setErrormessage(res['errorMessage']);
	}

	return (
		<div>
			<div>
				<label for='domain'>Quickbase Domain</label><br />
				<input type='text' name='domain' 
					placeholder='https://www.realm.quickbase.com' onChange={handleChange} /><br />
				<label for='username'>QB Username</label>
				<input type='text' name='username' onChange={handleChange}/><br />
				<label for='password'>QB Password</label>
				<input type='text' name='password' onChange={handleChange}/><br />
				<button onClick={getAuth}>Submit</button>
				{
					error ? <div><p>Error Message:</p><br/><p>{errormessage}</p></div>	
			 		: [ ticket.length != 0 ? 
			 			<Redirect to='/tableSelection' />
			 			: <p>Please Login to QB App</p>
			 		  ]
				}
			</div>
		</div>
	); 
}

class TableSelector extends Component {
	constructor() {
		super();
		this.state = {
			selectedDbid: null, 
			error: false,
			errorMessage: ''
		}
		this.exportTable = this.exportTable.bind(this);
	}

	async componentDidMount() {
		var tables = await ipcRenderer.sendSync('get-tables');
		var items = []; 
		for (const table of tables) {
			items.push(<option value={table.dbid}>{table.dbname}</option>); 
		}
		this.setState({tableList: items});
	}

	handleChange(event) {
		this.setState({selectedDbid: event.target.value});
	}

	exportTable() {
		var res = ipcRenderer.sendSync('get-table-details', {dbid: this.state.selectedDbid});
		console.log("exportTable() ");
		console.log(res);
	}

	render() {
		return (
			<div>
				<label for='appList'>Application Tables</label><br />
				<select name='appList' onChange={this.handleChange.bind(this)}>
					{this.state.tableList}
				</select>
				<br/> <br/>
				<button onClick={this.exportTable} >Export Documents!</button>
			</div>
		)
	}
}

export default App;
