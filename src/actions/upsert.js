import { UPSERT, } from './types';

export const upsert = (vote) => dispatch => {
    dispatch({
        type: UPSERT,
        payload: vote,
    })
}
