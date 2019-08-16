import { CENTER } from './types';

export const center = (coord) => dispatch => {
    dispatch({
        type: CENTER,
        payload: coord,
    })
}
