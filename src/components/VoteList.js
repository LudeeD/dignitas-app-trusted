import React, { Component } from 'react';

import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { connect } from 'react-redux';
import { upsert } from '../actions/upsert';
import { center } from '../actions/center';

const styles = theme => ({
        root: {
            width: '100%',
        },
        heading: {
            fontSize: theme.typography.pxToRem(15),
            fontWeight: theme.typography.fontWeightRegular,
        },
        button: {
            alignSelf: 'center',
        }
});

class VoteList extends Component {

    componentDidMount(){
        console.log('Here I will setup the socket')
        const { socket } = this.props;
        socket.emit('connection')
        socket.on('response', r =>{
            console.log("== response ==");
            console.log(r);
            this.props.upsert(r);}
        );
    }

    render() {

        let handleClick = (value, e) =>{ console.log(value) }
        const { classes }  = this.props;

        const votes = this.props.posts;

        const items = []

        votes.forEach( (value, key, map) =>{
            let date = new Date(value.timestamp*1000)
            items.push(
                <ExpansionPanel key={ key }>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header" >
                    <Typography>
                      {date.toLocaleString()} {value.title}
                    </Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails>
                    <Grid container spacing={3}>
                      <Grid item xs={6}>
                        <Typography className={classes.heading}>
                          {value.info}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography className={classes.heading}>
                          {value.status.type}<br/>True: {value.status.true}<br/>False: {value.status.false}<br/>Verdict: {value.status.verdict}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Button variant="contained" className={classes.button} onClick={()=> this.props.center([value.location.lat,value.location.lng])}>
                          See on Map
                        </Button>
                      </Grid>
                      <Grid item xs={3}>
                        <Button variant="contained" color="primary" className={classes.button}>
                          True
                        </Button>
                      </Grid>
                      <Grid item xs={3}>
                        <Button variant="contained" color="secondary" className={classes.button}>
                          False
                        </Button>
                      </Grid>
                    </Grid>
                  </ExpansionPanelDetails>
                </ExpansionPanel>
            )
        }
        )

        console.log("voteItems" + items)

        return(
            <div className={classes.root}>
              <h1>Votes</h1>
              { items }
            </div>
        )
    }
}

const mapStateToProps = state => ({
    posts: state.posts.votes
});

export default withStyles(styles)(connect(mapStateToProps, {upsert, center})(VoteList));
