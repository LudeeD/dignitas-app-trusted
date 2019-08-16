import React, { Component } from 'react'
import { Map, TileLayer, Marker, Popup } from 'react-leaflet'

import { connect } from 'react-redux';
import { center } from '../actions/center';



class MapSection extends Component<{}, State> {

    render() {
        const position = this.props.center_coord;
        console.log(position)
        const votes = this.props.posts;
        console.log(votes)

        const markers = []

        votes.forEach( (value, key, map ) => {
            let pos_marker = [value.location.lat, value.location.lng]
            markers.push(
              <Marker key={key} position={pos_marker}>
                <Popup>
                  {value.title}
                </Popup>
              </Marker>
            )
        });

        const zoom = 15;

        return (
            <Map center={position} zoom={zoom}>
            <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            { markers }
            </Map>
        )
    }
}

const mapStateToProps = state => ({
    posts: state.posts.votes,
    center_coord: state.posts.center_coord,
});

export default connect(mapStateToProps, {center})(MapSection)
