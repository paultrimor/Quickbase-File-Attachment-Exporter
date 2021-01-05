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
						<Route path="/exportConsole">
							<ExportConsole />
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
				error ? <p style={{fontStyle: 'italic', color: 'red'}}>ERROR: {errormessage}</p>	
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
			selectedDbid: '',
			error: false,
			errorMessage: '',
			numFiles: '',
			canExport: false,
			complete: false

		};
		this.getTableInfo = this.getTableInfo.bind(this);
		this.exportTable = this.exportTable.bind(this);
	}

	async componentDidMount() {
		var tables = await ipcRenderer.sendSync('get-tables');
		var items = [];
		items.push(<option value="" selected disabled hidden>Choose table to export here.</option>)
		for (const table of tables) {
			items.push(<option value={table.dbid}>{table.dbname}</option>); 
		}
		this.setState({tableList: items});
	}

	handleChange(event) {
		this.setState({selectedDbid: event.target.value});
	};

	async getTableInfo() {
		var res = await ipcRenderer.sendSync('get-table-details', {dbid: this.state.selectedDbid});
		this.setState({error: res.error});
		this.setState({errorMessage: res.errorMessage});
		if (!res.error) {
			var res = await ipcRenderer.sendSync('get-num-files');
			this.setState({error: res.error});
			this.setState({errorMessage: res.errorMessage});
			this.setState({numFiles: res.numFiles});
		}
		if (parseInt(this.state.numFiles) > 0 && !this.state.error) {
			this.setState({canExport: true});
		} else {
			this.setState({canExport: false});
		}
	}

	exportTable() {
		this.setState({complete: true});
	}

	render() {
		if (this.state.complete) {
			return (<Redirect to='/exportConsole' />);
		}
		return (
			<div style={{padding: "15px"}}>
				<label for='appList'>Application Tables</label><br />
				<div style={{
					width: "100%"
				}}>
					<select name='appList' onChange={this.handleChange.bind(this)}
						style={{width: "100%", padding: "5px"}}>
						{this.state.tableList}
					</select> 
					<button 
						disabled={this.state.selectedDbid.length === 0}
						onClick={this.getTableInfo} 
						style={{ marginTop: "10px", padding: "5px", display: "block",}}>Get Table Info</button>
				</div>
				<div class="message"
					style={{display: 'block', margin: '5px 0px', height: '150px'}}>
					{ this.state.error ?
						<p style={{fontStyle: 'italic', color: 'red'}}>
							<span style={{fontStyle: 'bold'}}>ERROR: </span>
								{this.state.errorMessage}
						</p>
						: this.state.canExport ? 
							<p style={{fontStyle: 'italic', color: 'green'}}>Success</p>
							: 
							<p></p>
					}
				</div>
				<button 
					disabled={!this.state.canExport}
					onClick={this.exportTable}
					style={{
						width: "85%",
						position: "absolute", 
						bottom: "20px", 
						left: "50%", transform: "translate(-50%, 0)", 
						padding: "5px" }}
				>Export {this.state.numFiles} Documents!</button>
			</div>
		)
	}
}

class ExportConsole extends Component {
	constructor() {
		super();
		this.state = {
			outputPath: '',
			message: ''
		};
	}

	async componentDidMount() {
		await ipcRenderer.sendSync('get-output-path');
		var res = await ipcRenderer.sendSync('get-files');
		console.log("get-files await finished: "); console.log(res);
		this.append("currently downloading "+res.files.length+" files...");
		for (var i = 0; i < res.files.length; i++) {
			this.downloadFile(res.files[i].url, res.files[i].filename);
		}
		console.log("componenentDidMount() end");
	}

	async downloadFile(url, filename) {
		console.log("downloadFile() Start");
		await ipcRenderer.sendSync('download-file', {url: url, filename: filename});
		this.append("append file: " + filename);
		console.log("downloadFile() End");
	}

	append(text) {
		console.log("append() " + text);
		var newMessage = this.state.message+"\n"+text;
		this.setState({message: newMessage});
	}

	render() {
		console.log("render()");
		return (
			<div>
				<pre style={{
					height: "400px"
				}}>
					{ this.state.message }
				</pre>
				<Link to="/tableSelection">Back To Table Selection</Link>
			</div>
		);
	}
}

export default App;
