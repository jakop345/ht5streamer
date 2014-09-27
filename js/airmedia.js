var http = require('http');
var fs = require('fs');

// settings
var confDir;
if (process.platform === 'win32') {
    confDir = process.env.APPDATA+'/ht5streamer';
} else {
    confDir = getUserHome()+'/.config/ht5streamer';
}
var settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
var token_string = settings.airMediaToken;

var APP_NAME       = 'ht5streamer';
var APP_VERSION    = '0.3';
var APP_ID         = 'fr.freebox.ht5streamer';
var FREEBOX_URL    = 'http://mafreebox.freebox.fr/';
var API_VERSION    = 'api_version';
var API_BASE_URL   = 'api/';

var LOGIN          = 'login/';
var LOGIN_AUTH     = 'login/authorize/';
var LOGIN_SESSION  = 'login/session/';

var AIRMEDIA_RECEIVERS = 'airmedia/receivers/';

var API = {};
var BASE_URL = '';
var session_token = '';

$(document).ready(function(){
    try {
        http.get('http://mafreebox.freebox.fr');
        console.log('freebox available, airplay enabled');
        //$('#airplayContainer').show();
        freeboxAvailable = true;
    } catch(err) {
        console.log('no freebox available, airplay disabled');
    }
    // get api version
    http.get(''+FREEBOX_URL+API_VERSION+'',function(res,err){
        var datas = [];
        res.on('data',function(chunk){
            datas.push(chunk);
        });
        res.on('end',function(){
            var data = datas.join('');
            var obj = JSON.parse(data);
            API.version = obj.api_version.split('.')[0];
            API.device_name = obj.device_name;
            BASE_URL = FREEBOX_URL+API_BASE_URL+'v'+API.version+'/';
            if ((token_string === undefined) || (token_string === '')) {
                console.log("Token undefined or empty, need authorisation");
                $.notif({title: 'Activation airplay:',img: 'images/authorize.png', timeout: 0,content:"Veuillez accepter l'autorisation qui s'affiche actuellement SUR VOTRE FREEBOX à la place de l'heure pour activer airplay...!",btnId:'notifOk',btnTitle:'Valider',btnColor: 'green',btnDisplay:'block',updateDisplay:'none'});
                ask_authorization();
            } else {
                console.log('airmedia already registered, token string : '+token_string);
                login();
            }
        });
    });
});

function ask_authorization() {
    var param = {"app_id": APP_ID, "app_name": APP_NAME, "app_version": APP_VERSION, "device_name": 'pc'};
    var paramString = JSON.stringify(param);
    
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': paramString.length
    };
    
    var options = {
        host: 'mafreebox.freebox.fr',
        port: 80,
        path: '/api/v'+API.version+'/'+LOGIN_AUTH,
        method: 'POST',
        headers: headers
    };
    
    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            // check response
            if (resultObject.success === true) {
                var track_id = resultObject.result["track_id"];
                token_string = resultObject.result["app_token"];
                wait_user_auth(track_id);
            } else {
                return;
            }
        });
    });
    req.write(paramString);
    req.end();
}

function wait_user_auth(track_id) {
    http.get('http://mafreebox.freebox.fr/api/v1/login/authorize/'+track_id+'',function(res){
        var datas = '';
        res.on('data',function(data){
            datas+=data;
        });
        res.on('end',function(){
            var obj = JSON.parse(datas);
            if (obj.success === true ) {
                var statut = obj.result['status'];
                if (statut === 'pending') {
                    console.log('waiting for user authorization...');
                    setTimeout("wait_user_auth("+track_id+")",5000);
                } else if (statut === 'granted') {
                    console.log('authorization validated by user, token : '+token_string);
                    $("#notification").hide();
                    saveToken();
                } else if (statut === 'timeout') {
                    console.log('authorization timeout...');
                    $("#notification").hide();
                    return;
                } else if (statut === 'denied') {
                    console.log('authorization denied by user...');
                    $("#notification").hide();
                    return;
                }
            } else {
                console.log('can t get authorization status...pending/timeout...')
                $("#notification").hide();
                return;
            }
        });
    });
}

function login(cb,params) {
    http.get('http://mafreebox.freebox.fr/api/v1/login/',function(res){
        var datas = '';
        res.on('data',function(data){
            datas+=data;
        });
        res.on('end',function(){
            var obj = JSON.parse(datas);
            if (obj.success === true ) {
                var challenge = obj.result["challenge"];
                var crypto = require('crypto')
                  , text = challenge
                  , key = token_string
                  , hash
                hash = crypto.createHmac('sha1', key).update(text).digest('hex');
                getSession(hash,cb,params);
            } else {
                console.log('can t get login session...')
                return;
            }
        });
    });
}

function getSession(passwd,cb,params) {
    var param = {"app_id": APP_ID, "password": passwd};
    var paramString = JSON.stringify(param);
    
    var headers = {
        'Content-Type': 'application/json',
        'Content-Length': paramString.length
    };
    
    var options = {
        host: 'mafreebox.freebox.fr',
        port: 80,
        path: '/api/v'+API.version+'/'+LOGIN_SESSION,
        method: 'POST',
        headers: headers
    };

    // Setup the request.  The options parameter is
    // the object we defined above.
    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            // check response
            if (resultObject.success === true) {
                session_token = resultObject.result['session_token'];
                console.log('session ok!, token : '+session_token);
                if (cb) {
                	cb(params);
                } 
            } else {
                console.log('can t get session token! : '+resultObject);
                return;
            }
        });
    });
    req.write(paramString);
    req.end();
}

// get airmedia receivers list
function getAirMediaReceivers() {
    console.log('get airmedia devices')
    var headers = {
        'X-Fbx-App-Auth': session_token
    };
    
    var options = {
        host: 'mafreebox.freebox.fr',
        port: 80,
        path: '/api/v'+API.version+'/'+AIRMEDIA_RECEIVERS,
        method: 'GET',
        headers: headers
    };
    
    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            // check response
            if (resultObject.success === true) {
                var list = resultObject.result;
                airMediaDevices = [];
                $('#fbxPopup').empty();
                $.each(list,function(index1,item) {
                    if (item.capabilities['video'] === true) {
                        var name = item.name;
                        if (airMediaDevices.length === 0) {
                            $('#fbxPopup').append('<span style="position:relative;top:-3px;">'+name + ' :</span> <input class="freebox" type=radio name="'+name+'" checked="true" value="'+name+'"> <br />');
                        } else {
                            $('#fbxPopup').append('<span style="position:relative;top:-3px;">'+name + ' :</span> <input class="freebox" type=radio name="'+name+'" value="'+name+'"> <br />');
                        }
                        airMediaDevices.push(name);
                    } else {
                        if(index1+1 === list.length) {
                          return loadQtip();
                        }
                        return true;
                    }
                    if(index1+1 === list.length) {
                        return loadQtip();
                    }
                  });
                
            } else {
                console.log('can t get airmedia receivers : '+responseString);
                return;
            }
        });
    });
    req.end();
}

function loadQtip() {
  if (airMediaDevice !== '') {
      $("#fbxPopup input").each(function(){
          var name = $(this).prop('name');
          if (name !== airMediaDevice) {
              $(this).prop('checked','');
          }
      });
      $("#fbxPopup input[name='"+airMediaDevice+"']").prop('checked','checked');
  }
  if (airMediaDevices.length === 1) {
      airMediaDevice = airMediaDevices[0];
      return;
  } else if (airMediaDevices.length === 0){
      var text = '<p>Aucun Freebox player allumé! <br>Allumez votre freebox player et réactivez ce bouton...</p>';
      $("#airplay-toggle").qtip({
      content : {text: text},
      position: {
        corner: {
          target: 'bottomMiddle',
          tooltip: 'topMiddle'
        }
      },
      show: { ready: true },
      hide: {
        event: 'unfocus',
        effect: function(offset) {
            $(this).slideDown(1000); // "this" refers to the tooltip
        }
      },
      style: { classes : 'qtip-youtube'},
      // The magic
      api: {
        onRender: function() {
          this.elements.tooltip.click(this.hide) //
        }
      }
    });
  } else {
    var text = $('#fbxPopup').html();
    $("#airplay-toggle").qtip({
      content : {text: text},
      position: {
        corner: {
          target: 'bottomMiddle',
          tooltip: 'topMiddle'
        }
      },
      show: { ready: true },
      hide: {
        event: 'unfocus',
        effect: function(offset) {
            $(this).slideDown(1000); // "this" refers to the tooltip
        }
      },
      style: { classes : 'qtip-youtube'},
      // The magic
      api: {
        onRender: function() {
          this.elements.tooltip.click(this.hide) //
        }
      }
    });
  }
}


function play_on_fbx(url) {
    if (typeof(url) === "object") {
        url = url.link;
    }
    var params = {"action": "start","media_type": "video","media": url,"password": ""}
    var paramString = JSON.stringify(params);
    
    var headers = {
        'X-Fbx-App-Auth': session_token,
        'Content-Type': 'application/json',
        'Content-Length': paramString.length
    };
    
    var options = {
        host: 'mafreebox.freebox.fr',
        port: 80,
        path: '/api/v1/airmedia/receivers/'+airMediaDevice+'/',
        method: 'POST',
        headers: headers
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            // check response
            if (resultObject.success === true) {
                console.log('media started... : '+url);
                airMediaPlaying = true;
                $('.mejs-container p#fbxMsg').remove();
                $('.mejs-container').append('<p id="fbxMsg" style="height:100px !important;position: absolute;top: 45%;margin: 0 50%;color: white;font-size: 30px;text-align: center;z-index: 10000;width: 450px;right: 50%;left: -225px;">Lecture en cours sur la freebox !</p>')
                currentAirMedia.link = url;
            } else {
                console.log('can t start the media...', responseString);
                airMediaPlaying = false;
                stop_on_fbx();
            }
        });
    });
    req.write(paramString);
    req.end();
}

function stop_on_fbx() {
    var params = {"action": "stop","media_type": "video"}
    var paramString = JSON.stringify(params);
    
    var headers = {
        'X-Fbx-App-Auth': session_token,
        'Content-Type': 'application/json',
        'Content-Length': paramString.length
    };
    
    var options = {
        host: 'mafreebox.freebox.fr',
        port: 80,
        path: '/api/v1/airmedia/receivers/'+airMediaDevice+'/',
        method: 'POST',
        headers: headers
    };

    var req = http.request(options, function(res) {
        res.setEncoding('utf-8');
        var responseString = '';
        res.on('data', function(data) {
            responseString += data;
        });
        res.on('end', function() {
            var resultObject = JSON.parse(responseString);
            // check response
            if (resultObject.success === true) {
                console.log('media stopped...');
                airMediaPlaying = false;
                $('.mejs-container p#fbxMsg').remove();
                initPlayer();
            } else {
                console.log('can t stop the media...');
                airMediaPlaying = false;
            }
        });
    });
    req.write(paramString);
    req.end();
}

function saveToken() {
    settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
    settings.airMediaToken = token_string;
    fs.writeFile(confDir+'/ht5conf.json', JSON.stringify(settings), function(err) {
        if(err) {
            console.log(err);
            return;
        } else {
            console.log('token successfully saved to config file...');
            login();
        }
    });
}

// add new download
function addFreeboxDownload(link) {
  var l = encodeURIComponent(link);
  var param = {"download_url": link};
  var paramString = JSON.stringify(param);
  
  var headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With':'XMLHttpRequest',
        'X-Fbx-App-Auth': session_token
	};
  
  $.ajax({
    type       : "POST",
    url        : 'http://mafreebox.freebox.fr/api/v1/downloads/add',
    headers    : headers,
    data       : param,
    crossDomain: true,
    beforeSend : function() {},
    complete   : function() {},
    success    : function(response) {
      if (response.success === true) {
		  $.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("Téléchargement ajouté avec succès sur la freebox!"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
      } else {
        $.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Impossible d'ajouter le téléchargement... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: '',updateDisplay:'none'});
      }
    },
    error: function(response) {
      $.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Impossible d'ajouter le téléchargement... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: '',updateDisplay:'none'});
    }
	});     
}

function upToFreebox(form) {
  console.log(form)
  var headers = {
        'Content-Type': 'multipart/form-data;'+form.getBoundary(),
        'Content-Length': parseInt(form._stream[4]),
        'X-Requested-With':'XMLHttpRequest',
        'X-Fbx-App-Auth': session_token
	};
  
  $.ajax({
    type       : "POST",
    url        : 'http://mafreebox.freebox.fr/api/v3/downloads/add',
    headers    : headers,
    data       : form._streams[0],
    crossDomain: true,
    contentType: false,
    processData: false,
    cache: false,
    beforeSend : function() {},
    complete   : function() {},
    success    : function(response) {
      if (response.success === true) {
		  $.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("Téléchargement ajouté avec succès sur la freebox!"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
      } else {
        $.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Impossible d'ajouter le téléchargement... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: '',updateDisplay:'none'});
      }
    },
    error: function(response) {
		console.log(response)
      $.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Impossible d'ajouter le téléchargement... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: '',updateDisplay:'none'});
    }
	});     
}
