var config = { //required config values for firebase project
	"apiKey": "",
	"authDomain": "",
	"databaseURL": "",
    "projectId": "",
    "storageBucket": "",
};

firebase.initializeApp(config);
var database = firebase.database();

var coreIDRef = firebase.database().ref('coreID');
var organisationRef = firebase.database().ref('organisations');
var buildingRef = firebase.database().ref('buildings');
var roomRef = firebase.database().ref('rooms');

//checks if this page is remove_sensor.html based on a class tag to determine what functions to run
$(function() {
	if($('body').hasClass('remove_sensor')) {
		var uID = document.getElementById('uid').getAttribute('value');
		listOwnedSensors(uID);
	}
});

//checks if this page is sensors.html based on a class tag to determine what functions to run
$(function() {
	if($('body').hasClass('rooms')) {
		var userOrganisation = document.getElementById('organisation-accordion').getAttribute('data-value');
		if (userOrganisation == 'default_list') {
			listOrganisations();
		}
	}
});

//checks if this page is index.html based on a class tag to determine what functions to run
$(function() {
	if($('body').hasClass('home')) {
		var organisationKeys = [];
		var userOrganisation = document.getElementById('organisation-accordion').getAttribute('data-value')
		if (userOrganisation != 'no_list') {
			organisationKeys.push(userOrganisation);
			listBuildings(organisationKeys);
		}
	}
});

//checks if this page is register_sensor.html based on a class tag to determine what functions to run
$(function() {
	if($('body').hasClass('register_sensor')) {
		document.getElementById('save_form').addEventListener('click', function(event) {
			event.preventDefault();

			var uID = document.getElementById('uid').getAttribute('value');	
			var coreID = id_coreid.value;
			var organisation = id_organisation.value;
			var building = id_building.value;
			var room = id_room.value;

			if (!room || !building || !coreID) { //requires all fields to contain input
				alert('All fields must be filled out');
				return false;
			}
			else if (coreID.length != 24) { //requires the coreid field to have exactly 24 characters. Max length is already set through the Django form
				alert('Core ID must be exactly 24 characters');
			}
			else {
				validForm(uID, coreID, organisation, building, room);
			}
		});
	}
});

//checks if this page is history.html based on a class tag to determine what functions to run
if($('body').hasClass('history')) {
	google.charts.load('current', {packages:['corechart']});
	google.charts.setOnLoadCallback(drawChart);
};

//lists each sensor owned by a given user based on their user id value
function listOwnedSensors(uID) {
	coreIDRef.orderByChild('uID').equalTo(uID).once('value').then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			var currentSensor = childSnapshot.key;
			$('#owned_sensors').append('<tr><td>'+ currentSensor + '</td><td id="' + currentSensor + '"><a href ="#"><i class="fa fa-times fa-lg" aria-hidden="true"></i></a></td></tr>');
			createEventListener(currentSensor);
		});
	});
};

//sets up a listener on a 'remove' element for each of the sensors listed by listOwnedSensors()
//removes all firebase references relevant to that sensor if executed
function createEventListener(currentSensor) {
	$(function() {
		$('#' + currentSensor).click(function() {
			var remove = confirm('Are you sure you want to delete this sensor?');
			if (remove) {
				coreIDRef.child(currentSensor).remove();
				roomRef.orderByChild('coreID').equalTo(currentSensor).once('value').then(function(snapshot) {
					snapshot.forEach(function(childSnapshot) {
						var roomName = childSnapshot.val().roomName;
						roomRef.child(childSnapshot.key).remove();
						removeRoom(roomName);
					});
				});
				$(this).parents('tr').remove(); //removes the row after removing the sensor
			}
		});
	});
};

//removes the room associated with a deleted sensor
function removeRoom(roomName) {
	buildingRef.orderByChild('room').equalTo(roomName).once('value').then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
		buildingRef.child(childSnapshot.key).remove();
		});
	});
};

//retrieves a list of all organisations
function listOrganisations() {
	var organisationKeys = [];
	organisationRef.once('value').then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			organisationKeys.push(childSnapshot.key);
		});
		listBuildings(organisationKeys);
	});

};

//for each organisation, a list of buildings associated with them are collected. If an organisation is in the system but has no buildings listed
//then it will be discarded
function listBuildings(organisationKeys) {
	for (let k = 0; k < organisationKeys.length; k++){
		buildingRef.orderByChild('organisation').equalTo(organisationKeys[k]).once('value').then(function(snapshot) {
			var tempBuildingNames = [];
			var tempOrgBuilding = [];
			var panelID = addPanel(organisationKeys[k], k + 1); //generates a new bootstrap panel for each organisation
			snapshot.forEach(function(buildingSnapshot) {
				if (buildingSnapshot.hasChild('rooms')) { //checks it a building has rooms associated with it before being pushed to an array
					var orgBuilding = buildingSnapshot.val().organisationBuilding;
					var buildingName = buildingSnapshot.val().buildingName;
					tempBuildingNames.push(buildingName);
					tempOrgBuilding.push(orgBuilding);
				}
			});
			listRooms(tempBuildingNames, tempOrgBuilding, panelID);
		});
	}
};

//for each building in the array, the list of rooms associated with it is created and added to the bootstrap panel body
function listRooms(tempBuildingNames, tempOrgBuilding, panelID) {
	for (let j = 0; j < tempBuildingNames.length; j++) {
		roomRef.orderByChild('organisationBuilding').equalTo(tempOrgBuilding[j]).once('value', function(snapshot) {
			//adds a <th> row to the bootstrap panel for the current building
			$('#' + panelID).append('<tr id="' + tempOrgBuilding[j] + '"><th style="min-width:250px">'+ tempBuildingNames[j] + 
				'</th><th style="min-width:100px"></th><th style="min-width:100px"></th><th style="min-width:147px"></th><th style="min-width:200px">Last Broadcast</th></tr>');
			snapshot.forEach(function(roomSnapshot) { 
				var roomName = roomSnapshot.val().roomName;
				var coreID = roomSnapshot.val().coreID;
				publishListener(coreID, panelID, roomName);
			});
		});
	}
};

//adds a new row to the current panel body for each sensor. Then listens for a new child addition to each sensor's log of published events and pushes them in realtime if triggered
function publishListener(coreID, panelID, roomName) {
	$('#' + panelID).append('<tr id="' + coreID + '"><td>'+ roomName + '</td><td></td><td></td><td></td><td>Inactive</td></tr>');
	var sensorRef = firebase.database().ref().child('sensors').child(coreID);
	sensorRef.orderByChild('timestamp').limitToLast(1).on('child_added', function(snapshot) {
		var data = snapshot.val();
		var temperature = data.temperature + '°C';
		var humidity = data.humidity + '%';
		var timestamp = moment.unix(data.timestamp).format('llll'); //format is Tue, Nov 7, 2017 5:33 PM
		populateRow(temperature, humidity, timestamp, coreID);
	});
};

//populates the row tds with the data for each of the sensors
function populateRow(temperature, humidity, timestamp, coreID) {
	$('#' + coreID + ' td').eq(1).html(temperature);
	$('#' + coreID + ' td').eq(2).html(humidity);
	$('#' + coreID + ' td').eq(3).html('<a id="' + coreID + '" href="history"><i class="fa fa-bar-chart fa-lg" aria-hidden="true"></i></a>');
	$('#' + coreID + ' td').eq(4).html(timestamp);
	
	$('#' + coreID + ' a').click(function (event) { //click listener for the sensor's history link
		sessionStorage.setItem('coreID', coreID); //grabs the coreid of the sensor that was clicked and temporarily stores it to be loaded by history.html
	});
};

//generates a new bootstrap panel for each organisation
function addPanel(organisation, k) {
    var queue = '<div class="panel panel-default">';
    queue += '<div class="panel-heading">';
    queue += '<h4 class="panel-title">';
    queue += '<a class="accordion-toggle" data-toggle="collapse" data-parent="#organisation-accordion" href="#collapse' + k + '"' + '> ' + organisation + '</a>';
    queue += '</h4>';
    queue += '</div>';
    queue += '<div id="collapse' + k + '" ' + 'class="panel-collapse collapse">';
    queue += '<div class="panel-body"></div>';
    queue += '</div>';
    queue += '</div>';
	$('#organisation-accordion').append(queue);
	return "collapse" + k;
};

//calls firebase write functions in order and passes through form field values
function validForm(uID, coreID, organisation, building, room) {
	var sensorRef = firebase.database().ref().child('coreID');
	var organisationBuilding = organisation + building;
	
	snapshotRef = sensorRef.child(coreID);
	snapshotRef.once('value', function(snapshot) {
		//checks to see if the coreID already exists
		if (snapshot.exists()) {
				alert('That ID has already been registered');
				return false;
		}
		else {
			sensorRef.update({[coreID]: true});
			sensorRef.child(coreID).update({uID: uID})
			.then(writeOrganisation(organisation, building))
			.then(writeBuilding(organisationBuilding, organisation, building, room))
			.then(writeRoom(organisationBuilding, building, room, coreID))
			.then(function(){
				alert('Submitted');
				window.location.replace('/sensors');
			});
		}
		return false;
	});
}

//writes/updates an organisation entry to firebase when a new sensor is registered
function writeOrganisation(organisation, building) {
		var organisationRef = firebase.database().ref().child('organisations');
		snapshotRef = organisationRef.child(organisation);
		snapshotRef.once('value', function(snapshot) {
			//if the snapshot exists (the organisation is already listed) it only updates the building list
			if (snapshot.exists()) {
				snapshotRef.update({[building]: true});
			}
			else {
			//creates a new parents node for the organisation and a building list
				organisationRef.update({[organisation]: true});
				organisationRef.child(organisation).update({[building]: true});
			}
		});
}

//writes/updates a building entry to firebase when a new sensor is registered
function writeBuilding(organisationBuilding, organisation, building, room) {
	var buildingRef = firebase.database().ref().child('buildings');
	var existingBuildingRef = buildingRef.orderByChild('organisationBuilding').equalTo(organisationBuilding);
	existingBuildingRef.once('value', function(snapshot) {
		if(snapshot.exists()) { //if a building belonging to the associated organisation already exists then the new room is appended to the room list
			snapshot.forEach(function(childSnapshot) {
				var buildingKey = childSnapshot.key;
				console.log(buildingKey);
				buildingRef.child(buildingKey + '/rooms').update({[room]: true});
			});
		}
		else { //else a new buliding node is added with all of the information
			var buildingKey = buildingRef.push().key; //creates a new building entry under an autogenerated key
			buildingRef.child(buildingKey).update({
			buildingName: building, organisation: organisation, organisationBuilding: organisationBuilding, rooms: true});
			buildingRef.child(buildingKey + '/rooms').update({[room]: true});
		}
	});
}

//writes a new room entry to firebase when a new sensor is registered
function writeRoom(organisationBuilding, building, room, coreID) {
	var roomRef = firebase.database().ref().child('rooms');
	var roomKey = roomRef.push().key; //creates a new room entry under an autogenerated key
	roomRef.child(roomKey).update({
		organisationBuilding: organisationBuilding, buildingName: building, roomName: room, coreID: coreID
	});
}

//draws graphs showing the 50 most recent events published be a sensor
function drawChart() {
	var tempHistory = [];
	var humidHistory = [];
	var dataTimestamp = [];	
	var sensorRef = firebase.database().ref().child('sensors/' + sessionStorage.getItem('coreid')); //grabs the coreid that was clicked on
	sensorRef.orderByChild('timestamp').limitToLast(50).once('value').then(function(snapshot) {
		snapshot.forEach(function(childSnapshot) {
			var childData = childSnapshot.val();
			var timestamp = childData.timestamp;
			var theDate = moment.unix(timestamp).format('llll');
			tempHistory.push(parseFloat(childData.temperature));
			humidHistory.push(parseFloat(childData.humidity));
			dataTimestamp.push(theDate);	
		});
		generateTempChart(tempHistory, dataTimestamp);
		generateHumidChart(humidHistory, dataTimestamp);
	});
};
	
function generateTempChart(tempHistory, dataTimestamp) {	
	var data = new google.visualization.DataTable(tempHistory);
	data.addColumn('string', 'Time');
	data.addColumn('number', 'Temperature');
	for (i = 0; i < tempHistory.length; i++) {
		data.addRow([dataTimestamp[i], tempHistory[i]]);
	}	
	var view = new google.visualization.DataView(data);
	var options = { //specifies the visual attributes of the graph
		title: 'Temperature History',
		width: 1000,
		height: 400,
		colors: ['#c90a0a'],
		bar: {groupWidth: '80%'},
		legend: { position: 'center' },
	}
	var chart = new google.visualization.ColumnChart(document.getElementById('columnchart_values_temp'));
	chart.draw(view, options);
};
	
function generateHumidChart(humidHistory, dataTimestamp) {	
	var data = new google.visualization.DataTable(humidHistory);
	data.addColumn('string', 'Time');
	data.addColumn('number', 'Humidity');
	for (i = 0; i < humidHistory.length; i++) {
		data.addRow([dataTimestamp[i], humidHistory[i]]);
	}	
	var view = new google.visualization.DataView(data);
	var options = { //specifies the visual attributes of the graph
		title: 'Humidity History',
		width: 1000,
		height: 400,
		bar: {groupWidth: '80%'},
		legend: { position: 'center' },
	}
	var chart = new google.visualization.ColumnChart(document.getElementById('columnchart_values_humid'));
	chart.draw(view, options);
};