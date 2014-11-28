define(["jquery" , "text!./graphics-deltaviz-leaflet.css", "text!./leaflet.css", "./leaflet"], function ( $, cssContent, cssLeaflet ) {

	'use strict';

	// Extension style sheet
	$("<style>").html(cssContent).appendTo("head");

	// Leaflet style sheet (fix Leaflet background images URL)
	var re = /url\(images/gi; 
	cssLeaflet = cssLeaflet.replace(re, "url(/extensions/graphics-deltaviz-leaflet/images");
	$("<style>").html(cssLeaflet).appendTo("head");

	return {

		// New object properties
		initialProperties: {
			version: 1.0,
			qHyperCubeDef: {
				qDimensions: [],
				qMeasures: [],
				qInterColumnSortOrder : [],
				qInitialDataFetch: [{
					qWidth: 5,
					qHeight: 2000
				}]
			}
		},

		// Property panel
		definition: {
			type: "items",
			component: "accordion",
			items: {
				dimensions: {
					uses: "dimensions",
					min: 1,
					max: 1
				},
				measures: {
					uses: "measures",
					min: 2,
					max: 4
				},
				sorting: {
					uses: "sorting"
				},
				settings: {
					uses: "settings"
				}
			}
		},

		// Snapshot availability
		snapshot: {
			canTakeSnapshot: true
		},

		// Object rendering
		paint: function ( $element, layout ) {

			// Create a new array that contains dimensions labels
			var dimensions = layout.qHyperCube.qDimensionInfo.map( function(d) {
				return {
					"title":d.qFallbackTitle
					}
			});

			// Create a new array that contains measures labels & bounds
			var measures = layout.qHyperCube.qMeasureInfo.map( function(d) {
				return {
					"title":d.qFallbackTitle,
					"min":d.qMin,
					"max":d.qMax
					}
			});

			// Create a new array for our extension with a row for each row in the qMatrix
			var qmDimension=0, qmLatitude=1, qmLongitude=2, qmValue=3, qmColor=4;
			var dataL = layout.qHyperCube.qDataPages[0].qMatrix.map( function(d) {
				// for each element in the matrix, create a new object that has a property for dimensions and measures
				return {
					"item" : d[qmDimension].qIsOtherCell ? this.backendApi.getDimensionInfos()[qmDimension].othersLabel : d[qmDimension].qText,
					"poi" : L.latLng(d[qmLatitude].qNum, d[qmLongitude].qNum),
					"size" : measures.length > 2 ? Math.max(50,Math.ceil(100 * d[qmValue].qNum/measures[2].max)) : 50,
					"fillcolor" : measures.length > 3 ? d[qmColor].qText : "green",
					"marker" : null,
					// Used for selection
					"dimensionid" : d[qmDimension].qIsOtherCell ? null : d[qmDimension].qElemNumber,
					"selected" : 0
					}
				})
			;

			// Suppress null values
			for (var cell = dataL.length-1; cell >= 0; --cell) {
				if (dataL[cell].size == 0)
					dataL.splice(cell, 1);
			}

 			// Map element  
			var width = $element.width();
			var height = $element.height();
			var id = "graphics-deltaviz-leaflet-" + layout.qInfo.qId;
			if (document.getElementById(id)) {
				$("#" + id).remove();
			}
			$element.append($('<div />;').attr("id", id).width(width).height(height));

			// Extension properties edit mode 
			var editMode = angular.element($element).scope().$parent.$parent.editmode;

			// Leaflet rendering
			var self = this;
			leafletViz (
				self,
				dataL, 
				dimensions,
				measures, 
				width, 
				height,
				id, 
				editMode
			);

		} // Paint

	}; // Extension function

} ); // Extension definition

var leafletViz = function ( self, dataL, dimensions, measures, width, height, id, editMode ) { 

	// Set up the map
	var map = new L.Map(id);

	// Do not interact with map while editing extension properties
	if ( editMode ) {
		map.dragging.disable();
	}

	// Compute map bounds
	var southWest = L.latLng(measures[0].min, measures[1].min),
		northEast = L.latLng(measures[0].max, measures[1].max),
		mapBounds = L.latLngBounds(southWest, northEast)
	;

	// Adjust map size & zoom
	var maxZoom = 17;
	if ( dataL.length > 1 ) {
		// View all POIs
		map.fitBounds(mapBounds);
	} else if ( dataL.length == 1 ) {
		// Zoom on single POI
		map.setView( dataL[0].poi, maxZoom);
	} else {
		// You are certainly somewhere on earth...
		map.fitWorld();
	}
	var minZoom = map.getBoundsZoom(map.getBounds());
	
	// Show metric scale
	L.control.scale({imperial:false}).addTo(map);

	// Define base tile layers
	// See samples at : http://leaflet-extras.github.io/leaflet-providers/preview/
	var OpenStreetMap = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		"minZoom": minZoom, "maxZoom": maxZoom, attribution: 'contributeurs &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {
		"minZoom": minZoom, "maxZoom": maxZoom, attribution: 'contributeurs &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	var Thunderforest_Transport = L.tileLayer('http://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png', {
		"minZoom": minZoom, "maxZoom": maxZoom, attribution: '&copy; <a href="http://www.opencyclemap.org">OpenCycleMap</a>, contributeurs &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	});
	var Esri_WorldStreetMap = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
		"minZoom": minZoom, "maxZoom": maxZoom, attribution: '&copy; Esri &mdash; Sources: Esri, HERE, DeLorme, USGS, Intermap, increment P Corp., NRCAN, METI, TomTom, MapmyIndia, &copy; contributeurs OpenStreetMap & GIS Community'
	});
	var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		"minZoom": minZoom, "maxZoom": maxZoom, attribution: '&copy; Esri &mdash; Sources: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, & GIS Community'
	});

	// Setup data layer
	var overlayLayer = new L.LayerGroup();
	for (var row = 0; row < dataL.length; ++row) {
		// Each POI is drawn as an up to 100m circle
		dataL[row].marker = new L.circle( dataL[row].poi, dataL[row].size, {
			"stroke": false,
			"fillColor": dataL[row].fillcolor,
			"fillOpacity": 0.5
		});
		dataL[row].marker.addTo(overlayLayer);
	}

	// Set default layers
	map.addLayer(OpenStreetMap_BlackAndWhite);
	map.addLayer(overlayLayer);
	map.attributionControl.setPrefix('&copy;&nbsp;<a href="http://deltaviz.graphics/">deltaViz</a>&nbsp;<a href="http://leafletjs.com/">Leaflet</a>');

	// Set layers control
	var baseLayersList = {
		"Open Street Map" : OpenStreetMap,
		"Open Street Map Black & White": OpenStreetMap_BlackAndWhite,
		"Thunderforest Transport" : Thunderforest_Transport,
		"ESRI Streets map" : Esri_WorldStreetMap,
		"ESRI Sattelite" : Esri_WorldImagery
	};
	var overlayLayersList = [];
	overlayLayersList[dimensions[0].title] = overlayLayer;
	L.control.layers(baseLayersList,overlayLayersList).addTo(map);

	// User selection
	function onMapClick(e) {

		// Nothing to find
		if (self.selectionsEnabled == false || dataL.length < 1) 
			return; 

		// Search nearest Point of interest
		var nearest, d2min, d2;
		for (var row = 0; row < dataL.length; ++row) {
			// Compute plane square distance (faster than Haversine formula) for each POI
			d2 = (e.latlng.lat - dataL[row].poi.lat) * (e.latlng.lat - dataL[row].poi.lat)
			   + (e.latlng.lng - dataL[row].poi.lng) * (e.latlng.lng - dataL[row].poi.lng);
			if (row == 0 || d2 < d2min ) {
				nearest = row;
				d2min = d2;
			}
		}

		// User click inside POI ? (maximum real distance is circle size in meters)
		if ( e.latlng.distanceTo(dataL[nearest].poi) <= dataL[nearest].size ) {

			// No dimension here...
			if ( dataL[nearest].dimensionid === null || dataL[nearest].item === undefined)
				return;

			// Toggle selection (visual feedback)
			dataL[nearest].selected = 1-dataL[nearest].selected;
			if ( dataL[nearest].selected ) {
				// Highlight selected POI
				dataL[nearest].marker.setStyle({fillOpacity: 0.75, stroke: true, weight:2, color: "black"});
				dataL[nearest].marker.bringToFront();
			} else {
				// Unselect POI
				dataL[nearest].marker.setStyle({fillOpacity: 0.5, stroke: false});
				dataL[nearest].marker.bringToBack();
			} 

			// Toggle selection (Sense)
			var dim = 0, value = dataL[nearest].dimensionid;
			self.selectValues(dim, [value], true);

		} 
	}

	// Handle user selections
	map.on('click', onMapClick);

}; // leafletViz