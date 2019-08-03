import React, { Component } from 'react';
import { connect } from 'react-redux';
import start from '../subscriber'

class VoteList extends Component {

    componentWillMount(){

        console.log('Here I will setup the socket')
        start()
        console.log('Qui Sa')

    }

    render() {
        const keys = Object.keys(this.props.posts)
        const votes = this.props.posts;
        const voteItems = keys.map(a_key => (
            <div key={votes[a_key].id}>
              <h3>{votes[a_key].title}</h3>
            </div>
        ));

        return(
            <div>
              <h1>Votes</h1>
              { voteItems }
            </div>
        )
    }
}

const mapStateToProps = state => ({
  posts: state.posts.votes
});

export default connect(mapStateToProps, { })(VoteList);
