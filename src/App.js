import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Provider } from 'react-redux';
import store from './store';

import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import AppBar from './components/AppBar'
import MapSection from './components/MapSection'
import VoteList from './components/VoteList'

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  paper: {
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
}));


function App() {
  const classes = useStyles();

  return (
    <Provider store={ store }>
      <div className={classes.root}>
        <AppBar/>
        <div style={{ padding: 10 }}>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <MapSection/>
            </Grid>
            <Grid item xs={6}>
              <VoteList/>
            </Grid>
          </Grid>
        </div>
      </div>
    </Provider>
  );
}

export default App;
