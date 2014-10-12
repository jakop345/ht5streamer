
function checkUpdates() {
	try {
		http.get('http://ubukey.fr/ht5streamer/update.html',function(res,err){
			var datas = [];
			res.on('data',function(chunk){
				datas.push(chunk);
			});
			res.on('end',function(){
				console.log("Checking for updates....");
				var data = datas.join('');
				var txt = $('p',data).prevObject[1].innerHTML;
				online_version = txt;
				try {
					console.log("online version : "+online_version+', current version : '+ settings.version);
				} catch(err){
					console.log(err);
					return;
				}
				if (online_version === undefined) {
					$.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("Website ubukey.fr is unreachable !"),btnId:'updateBtn',btnTitle:_('Update'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'})
				} else if (online_version === settings.version) {
					$.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',content:_("Your software is up to date !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
				} else if (online_version !== settings.version && online_version !== undefined) {
					$.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("A new version is available !"),btnId:'updateBtn',btnTitle:_('Update'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'})
				} else {
					$.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("ubukey is unreachable !"),btnId:'updateBtn',btnTitle:_('Update'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'})
				}
				$.notif({title: 'Ht5streamer:',cls:'green',icon: '&#10003;',timeout:7000,content:_("Please DONATE if you like this software !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'})
			});
		}).error(function(err) {
			$.notif({title: 'Ht5streamer:',cls:'red',icon: '&#59256;',timeout:0,content:_("ubukey is unreachable !"),btnId:'updateBtn',btnTitle:_('Update'),btnColor:'black',btnDisplay: 'block',updateDisplay:'none'})
		});
	} catch (err) {
		console.log("offline mode or update server down....");
	}
}

// udpates
$(document).on('click','#updateBtn',function(e) {
	e.preventDefault();
	var arch = process.arch;
	var file = '';
	var link = '';
	if (process.platform === 'win32') {
		file = 'ht5streamer-setup.exe';
		link = 'http://ubukey.fr/ht5streamer/windows/'+file;
	} else if (process.platform === 'darwin') {
		 file = 'Ht5streamer-osx.zip';
		 link = 'http://www.ubukey.fr/ht5streamer/osx/'+file;
	} else {
		if (arch === 'ia32') {
			console.log('linux 32 bits detected...');
			file = 'ht5streamer-32.zip';
		} else if (arch === 'x64') {
			console.log('linux 64 bits detected...');
			file = 'ht5streamer-64.zip';
		}
		link = 'http://ubukey.fr/ht5streamer/'+file;
	}
	downloadUpdate(link,file);
});

$(document).on('click','#startWinUpdate',function(e) {
	e.preventDefault();
	gui.Shell.openItem(updatePath);
	setTimeout(function(){win.emit('close')},3000);
});

function downloadUpdate(link,filename) {
    $.notif({title: 'Ht5streamer update:',icon: '&#128229;',timeout:0,content:'',btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'block'});
    // remove file if already exist
    pbar = $('#updateProgress');
    execDir = path.dirname(process.execPath);
    // start download
    $('#updateProgress strong').html(_('Waiting for connection...'));
    var val = $('#updateProgress progress').attr('value');
    var currentTime;
    var startTime = (new Date()).getTime();
    current_download = http.request(link,
    function (response) {
	var contentLength = response.headers["content-length"];
    if (parseInt(contentLength) === 0) {
		$('#updateProgress strong').html(_("can't download this file..."));
		setTimeout(function(){pbar.hide()},5000);
    }
    temp.mkdir('ht5streamer', function(err, dirPath) {
	tmpPath = dirPath;
	var target;
	if (process.platform === 'win32') {
		target = dirPath+'\\'+filename;
	} else {
		target = dirPath+'/'+filename;
	}
	var file = fs.createWriteStream(target);
	response.on('data',function (chunk) {
		file.write(chunk);
		var bytesDone = file.bytesWritten;
		currentTime = (new Date()).getTime();
		var transfer_speed = (bytesDone / ( currentTime - startTime)).toFixed(2);
		var newVal= bytesDone*100/contentLength;
		var txt = Math.floor(newVal)+'% '+ _('done at')+' '+transfer_speed+' kb/s';
		$('#updateProgress progress').attr('value',newVal).text(txt);
		$('#updateProgress strong').html(txt);
	});
	response.on('end', function() {
	    file.end();
	    $('#updateProgress b').empty();
	    $('#updateProgress strong').html(_('Download ended !'));
	    $('#updateProgress progress').hide();
	    var execDir = path.dirname(process.execPath);
	    var update;
	    process.chdir(tmpPath);
	    $('#updateProgress strong').html(_('Installing update...'));
	    
	    if (process.platform === 'win32') {
			$('.notification').click();
			$.notif({title: 'Ht5streamer:',cls:'green',timeout:10000,icon: '&#10003;',content:_("Click ok to launch the update installer"),btnId:'startWinUpdate',btnTitle:'Ok',btnColor:'black',btnDisplay: 'block',updateDisplay:'none'});
			updatePath = tmpPath.replace(/\\/g,"\\\\")+'\\\\ht5streamer-setup.exe';
 	    } else if (process.platform === 'darwin') {
			var dest = path.dirname(execDir.match(/(.*)Ht5streamer.app(.*?)/)[0]);
			var args = ['-o',filename,'-d',dest];
			var ls = spawn('stat', ['-c','%U', execDir]);
			ls.stdout.on('data', function (data) {
				console.log('permissions for install dir :' + data.toString())
			  if(data.toString() === 'root') {
				  console.log('need root to update');
				  installAsAdmin(_('Please enter your sudo/admin password to install the update'),filename,execDir);
			  } else {
				  setTimeout(function(){
					installUpdate(args)
				  },3000);
			  }
			});

			ls.stderr.on('data', function (data) {
			  $.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... or try to reinstall manually !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
			});
 	    } else {
			console.log('install for linux...')
		    var args = ['-o',filename,'-d',execDir];
			var ls = spawn('stat', ['-c','%U', execDir]);
			ls.stdout.on('data', function (data) {
				console.log('permissions for install dir :"' + data.toString()+ '"')
				if(data.toString().trim() === 'root') {
					console.log('need root to update');
					installAsAdmin(_('Please enter your sudo/admin password to install the update'),filename,execDir);
				} else {
					setTimeout(function(){
						installUpdate(args);
					},3000);
				}
			});

			ls.stderr.on('data', function (data) {
			  $.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... or try to reinstall manually !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
			});
		}
	});
    });
});
current_download.end();
}

function installAsAdmin(msg,file,dest) {
	$.prompt(msg,'',function(res){
	  if(res === null) {
		  $('.notification').click();
		  $.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... or try to reinstall manually !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
		  return;  
	  } else {
		  var pass = res;
		  var options = {
			  cachePassword: true,
			  prompt: 'password:',
			  spawnOptions: { /* other options for spawn */ }
		  }
		  // test password
		  var child = sudo([ 'ls', '-l', '/' ], options, pass);
		  child.on('exit',function(code) {
			  if(code === 0) {
			        console.log('sudo command ok!, unzipping update');
			        var child2 = sudo(['unzip','-o',file,'-d',dest], options, pass);
			        child2.stdout.on('data',function(data) {
						console.log(data.toString());
					});
			        child2.on('exit',function(code2) {
						$('.notification').click();
						if(parseInt(code2) === 0) {
							$.notif({title: 'Ht5streamer:',cls:'green',timeout:10000,icon: '&#10003;',content:_("Update successfully installed! please restart ht5streamer"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
						} else {
							$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... or try to reinstall manually !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
						}
					});
					child2.stderr.on('data', function(data) {
						$('.notification').click();
						$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
						console.log('update stderr: ' + data);
					});
			  } else {
					console.log('bad sudo command')
				    installAsAdmin(_('Wrong password, please retry or cancel...'),file,dest);
			  }
		  });
	  }
	},true);
}

function installUpdate(args) {
	console.log('update args', args)
	var update = spawn('unzip', args);
	update.stdout.on('data',function(data) {
		console.log(data.toString());
	});
	update.on('exit', function(code){
		$('.notification').click();
		if (code === 0) {
			$.notif({title: 'Ht5streamer:',cls:'green',timeout:10000,icon: '&#10003;',content:_("Update successfully installed! please restart ht5streamer"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
		} else {
			$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... or try to reinstall manually !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
		}
	});
	update.stderr.on('data', function(data) {
		$('.notification').click();
		$.notif({title: 'Ht5streamer:',cls:'red',timeout:10000,icon: '&#10006;',content:_("Update error, please report the problem... !"),btnId:'',btnTitle:'',btnColor:'',btnDisplay: 'none',updateDisplay:'none'});
		console.log('update stderr: ' + data);
	});
}
