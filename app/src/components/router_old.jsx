// Test the request module 
var {ipcRenderer, remote} = window.require('electron'); 

import React, {Component} from 'react';
import {BrowserRouter as Router, Switch, Route, Redirect, Link, useHistory} from 'react-router-dom';
import {Login, MethodSelect, ActionSelect,
  ImportNew, ImportUpdate, Export, ReportLinkInstructions} from './pages.jsx'; 

class App extends Component {

  constructor() {
    super();
    
    this.state = {
      domain: null,
      username: null, 
      password: null, 
      authToken: null, 
      application_dbid: null,

      isLoginSuccess: null, 
      isImport: null,
      isUpdate: null, 

      report_link: null, 
      table_dbid: null, 
      document_fid: null
    };

    this.updateState = this.updateState.bind(this);

  }

  updateState(obj) { 
    this.setState(obj);
  }

  render(){
     
    return (
	 <Router> 

    <h2>Quickbase Document Handler</h2>

		<div>
      <table>
        <tr>
          <td>AuthToken:</td>
          <td>{this.state.authToken}</td>
        </tr>
        <tr>
          <td>Action:</td>
          <td>{
            this.state.isImport != null ? 
            this.state.isImport ? 'IMPORT' : 'EXPORT' : null
          }</td>
        </tr>
        <tr>
          <td>Method:</td>
          <td>{
            this.state.isUpdate != null ? 
            this.state.isUpdate ? 'UPDATE' : 'NEW' : null
          }</td>
        </tr>
      </table>

  			<div>
          <Switch>
            <Route path='/login' >
              <Login setProperty={this.updateState.bind(this)} />
              { this.state.isLoginSuccess ? <Redirect to='/methodSelect' /> : null}
            </Route>
            <Route path='/methodSelect'>
              <MethodSelect setProperty={this.updateState.bind(this)} />
              { this.state.isImport != null ? 
                this.state.isImport ? <Redirect to='/actionSelect' /> : <Redirect to='export'/> 
                : null
              }
            </Route>
            <Route path='/actionSelect'>
              <ActionSelect setProperty={this.updateState.bind(this)} />
              { this.state.isUpdate != null ? 
                this.state.isUpdate ? <Redirect to='/importUpdate' /> : <Redirect to='/importNew' />
                : null 
              }
            </Route>
            <Route path='/importNew'>
              <ImportNew />
            </Route>
            <Route path='/importUpdate'>
              <ImportUpdate />
              <ReportLinkInstructions />
            </Route>
            <Route path='/export'>
              <Export />
              <ReportLinkInstructions />
            </Route>
            <Route path="/">
              <Redirect to='/login' />
            </Route>
          </Switch>
  			</div>      

      </div>
		</Router>

	 ); 
  } 
}


// Use this for Debugging. 
function InfoMenu(props) {

  var values = Object.values(props)[0];   
  var items = []; 

  for (const [key, value] of Object.entries(values)) {
    items.push(<tr><td>{key}</td><td>{String(value)}</td></tr>)
  }

  return (
    <div style={{'border': '2px solid purple'}}>
      <table>
        {items}
      </table>
    </div>
  );
}


export default App; 