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
		<div style={{padding: "5px"}}>
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
	); 
}

class TableSelector extends Component {
	constructor() {
		super();
		this.state = {
			selectedDbid: null, 
			error: false,
			errorMessage: '',
			numFiles: '',
			canExport: false

		};
		this.getTableInfo = this.getTableInfo.bind(this);
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

	async getTableInfo() {
		var res = await ipcRenderer.sendSync('get-table-details', {dbid: this.state.selectedDbid});
		this.setState({error: res.error});
		this.setState({errorMessage: res.errorMessage});
		var res = await ipcRenderer.sendSync('get-num-files');
		this.setState({numFiles: res.numFiles});

		if (parseInt(this.state.numFiles) > 0 && !this.state.error) {
			this.setState({canExport: true});
		} else {
			this.setState({canExport: false});
		}
		console.log("getTableInfo() END");
		console.log(this.state);
	}

	render() {
		return (
			<div style={{padding: "15px"}}>
				<label for='appList'>Application Tables</label><br />
				<div style={{
					width: "100%"
				}}>
					<select name='appList' onChange={this.handleChange.bind(this)}
						style={{width: "75%"}}>
						{this.state.tableList}
					</select> 
						<button onClick={this.getTableInfo} 
							style={{width: "20%"}}>Get Table Info!</button>
				</div>
				{ this.state.error ?
					<div>
						<p>Error</p>
						<p>{this.state.errorMessage}</p>
					</div>
					: <p></p>
				}
				<button 
					disabled={!this.state.canExport}
					style={{ position: "absolute", bottom: "20px", width: "80%", margin: "auto" }}
				>Export {this.state.numFiles} Documents!</button>
			</div>
		)
	}
}

export default App;
