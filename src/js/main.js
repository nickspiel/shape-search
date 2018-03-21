/* global google */
let map;
let shape;
let markers = [];

const clearOverlay = overlay => (
  overlay && overlay.setMap(null)
);

const disableMap = () => {
  map.setOptions({
    draggable: false,
    zoomControl: false,
    scrollwheel: false,
    disableDoubleClickZoom: false,
    style: {
      cursor: 'crosshair',
    },
  });
};

const enableMap = () => {
  map.setOptions({
    draggable: true,
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: true,
  });
};

const insertMarkers = (markerCoordinates) => {
  markers = markerCoordinates.map(marker => (
    new google.maps.Marker(marker) // eslint-disable-line no-new
  ));
};

const prepareMarkerObject = points => (
  points.map((point) => {
    const {
      address: {
        geocode,
      },
      title,
    } = point._source; // eslint-disable-line no-underscore-dangle

    return {
      title,
      position: {
        lat: geocode.lat,
        lng: geocode.lon,
      },
      map,
    };
  })
);

const prepareGeocodes = points => (
  points.map(point => ({
    lat: point.lat(),
    lon: point.lng(),
  }))
);

const getListings = points => (
  fetch(
    'http://localhost:9200/listing-4.3/listing/_search',
    {
      headers: {
        'content-type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        query: {
          bool: {
            filter: {
              geo_polygon: {
                'address.geocode': {
                  points: prepareGeocodes(points),
                },
              },
            },
          },
        },
      }),
    },
  )
    .then(response => response.json())
    .then(listings => listings.hits.hits)
    .then(prepareMarkerObject)
    .then(insertMarkers)
);

const resetMap = () => {
  clearOverlay(shape);
  markers.forEach(clearOverlay);
};

const drawFreeHand = () => {
  // the polygon
  shape = new google.maps.Polyline({
    map,
    clickable: false,
    strokeColor: '#697685',
    strokeWeight: 5,
  });

  // move-listener
  const move = google.maps.event.addListener(map, 'mousemove', (event) => {
    shape.getPath().push(event.latLng);
  });

  // mouseup-listener
  google.maps.event.addListenerOnce(map, 'mouseup', () => {
    google.maps.event.removeListener(move);
    const path = shape.getPath();
    shape.setMap(null);
    shape = new google.maps.Polygon({
      map,
      path,
      strokeColor: '#697685',
      strokeWeight: 5,
      fillColor: '#697685',
      fillOpacity: 0.35,
    });

    google.maps.event.clearListeners(map.getDiv(), 'mousedown');
    getListings(shape.getPath().getArray());
    enableMap();
  });
};

const initMap = () => { // eslint-disable-line no-unused-vars
  map = new google.maps.Map(document.getElementById('map'), { // eslint-disable-line no-new
    center: {
      lat: -34.397,
      lng: 150.644,
    },
    zoom: 8,
    draggingCursor: 'crosshair, grabbing',
    draggableCursor: 'crosshair, grab',
    disableDefaultUI: true,
  });

  document.getElementById('drawButton').addEventListener('click', () => {
    disableMap();
    resetMap();
    google.maps.event.addDomListener(map.getDiv(), 'mousedown', () => {
      drawFreeHand();
    });
  });
};
