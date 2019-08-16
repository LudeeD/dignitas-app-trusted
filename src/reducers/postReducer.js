import { UPSERT, CENTER} from '../actions/types';

const initialState = {
    votes : new Map([["123",{
                              "id": "6fc3f26fa739",
                              "timestamp": 1565796103,
                              "location": {
                                "lat": 40.636258,
                                "lng": -8.658118,
                                "direction": 1
                              },
                              "title": "Gato preso na árvore 2",
                              "info": "grande comução à volta de um gato preso numa árvore",
                              "status": {
                                "type": "OPEN",
                                "true": 0,
                                "false": 0,
                                "verdict": "UNRESOLVED"
                              }
                            }
                      ],]),

    center_coord: [1,1],
}

export default function( state = initialState, action) {
    switch(action.type) {
        case UPSERT:
            let new_votes = new Map(state.votes);
            let vote = action.payload;
            new_votes.set(vote.id, vote);
            return{...state, votes: new_votes}

        case CENTER:
            console.log("center")
            return{...state, center_coord: action.payload}

        default:
            return state;
    }
}
