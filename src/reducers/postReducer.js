import { UPSERT, } from '../actions/types';

const initialState = {
    votes : {'abc': { 'title': 'Pilas Tortas' }},
}

export default function( state = initialState, action) {
    switch(action.type) {
        case UPSERT:
            let vote = action.payload;
            let id = vote.id;
            state.votes[id] = vote
            return state;
        default:
            return state;
    }
}
