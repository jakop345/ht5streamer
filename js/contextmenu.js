//~ Copyright (C) Laguillaumie sylvain
//
//~ This program is free software; you can redistribute it and/or
//~ modify it under the terms of the GNU General Public License
//~ as published by the Free Software Foundation; either version 2
//~ of the License, or (at your option) any later version.
//~ 
//~ This program is distributed in the hope that it will be useful,
//~ but WITHOUT ANY WARRANTY; without even the implied warranty of
//~ MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//~ GNU General Public License for more details.
//~ 
//~ You should have received a copy of the GNU General Public License
//~ along with this program; if not, write to the Free Software
//~ Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

var clipboard = gui.Clipboard.get();

$(document).ready(function() {
	$.event.special.rightclick = {
		bindType: "contextmenu",
		delegateType: "contextmenu"
	};
	$(document).on("rightclick", ".start_video", function(e) {
		var evid = $(this).parent().closest('.youtube_item').find('div')[5].id;
		var vid = '';
		var title = $(this)[0].text;
		if (evid.match('_sub') === null) {
			vid = evid.replace('youtube_entry_res_','');
		} else {
			vid = evid.replace('youtube_entry_res_sub_','');
		}
		if (vid === '') {return;}
		try {
			$('#copy_link').parent().remove();
			$('#save_link').parent().remove();
			if (search_engine === 'youtube') {
				var link = "http://www.youtube.com/watch?v="+vid;
				var engine='youtube';
				$('#custom-menu ol').append('<li><a id="copy_link" href="#" alt="'+vid+'::'+title+'::'+link+'::'+engine+'">'+myLocalize.translate("Copy youtube link")+'</a></li>');
				$('#custom-menu ol').append('<li><a id="save_link" href="#" alt="'+vid+'::'+title+'::'+link+'::'+engine+'">'+myLocalize.translate("Save to playlist")+'</a></li>');
			} else if (search_engine === 'dailymotion') {
				var link = "http://www.dailymotion.com/video/"+vid;
				var engine='dailymotion';
				$('#custom-menu ol').append('<li><a id="copy_link" href="#" alt="'+vid+'::'+title+'::'+link+'::'+engine+'">'+myLocalize.translate("Copy dailymotion link")+'</a></li>');
				$('#custom-menu ol').append('<li><a id="save_link" href="#" alt="'+vid+'::'+title+'::'+link+'::'+engine+'">'+myLocalize.translate("Save to playlist")+'</a></li>');
			}
		} catch(err) {
			console.log("can't detect link to copy..." + err);
		}
		$("#custom-menu").css({ top: e.pageY + "px", left: e.pageX + "px" }).show(100);
		return false;
	});
    //custom context menu
    try {
		$(document).bind("contextmenu", function(e) {
			e.preventDefault();
			$('#copy_link').parent().remove();
			$('#copy').parent().remove();
			$('#paste_ytlink').parent().remove();
			var ytlink = getYtlinkFromClipboard();
			var textStr = getSelectedText();
			if (textStr !== null) {
				$('#custom-menu ol').append('<li><a id="copy" href="#">'+myLocalize.translate("Copy")+'</a></li>');
			}
			if ((search_engine === 'youtube') && ytlink !== null) {
				$('#custom-menu ol').append('<li><a id="paste_ytlink" href="#">'+myLocalize.translate("Paste/Open youtube link")+'</a></li>');
			}
			if ($('#custom-menu li').length === 0 ) {
				return;
			} else {
				$("#custom-menu").css({ top: e.pageY + "px", left: e.pageX + "px" }).show(100);
			}
			return false;
		});
		
		$('#custom-menu').click(function() {
			$('#custom-menu').hide();
		});
		$(document).click(function() {
			$('#custom-menu').hide();
		});
	} catch (err) {
		console.log(err);
	}
	//copy to clipboard
	$(document).on('click','#copy',function() {
		clipboard.clear();
		var text = getSelectedText();
		if (text !== null) {
			clipboard.set(''+text+'','text');
			$('#custom-menu').hide();
		}
    });
    // paste yt link
    $(document).on('click','#paste_ytlink',function(e) {
		e.preventDefault();
		var ytlink = getYtlinkFromClipboard();
		youtube.getVideoInfos(ytlink,0,1,function(datas) {fillPlaylist(datas,false,'','youtube')});
		$('#custom-menu').hide();
	});
	// copy link
	$(document).on('click','#copy_link',function(e) {
		e.preventDefault();
		clipboard.clear();
		var text = $(this).attr('alt').split('::')[2];
		clipboard.set(''+text+'','text');
		$('#custom-menu').hide();
	});
	// save link
	$(document).on('click','#save_link',function(e) {
		e.preventDefault();
		settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
		settings.selectedDir = '';
		var vid = $(this).attr('alt').split('::')[0];
		var title= $(this).attr('alt').split('::')[1];
		var link = $(this).attr('alt').split('::')[2];
		var engine = $(this).attr('alt').split('::')[3];
		var new_win = gui.Window.open('selectdir.html', {
              "position": 'center',
              "width": 400,
              "height": 400,
              "toolbar": true
            });
            new_win.on('close', function() {
				settings = JSON.parse(fs.readFileSync(confDir+'/ht5conf.json', encoding="utf-8"));
				if ((settings.selectedDir === '') || (settings.selectedDir === undefined)) {
					this.hide();
					this.close(true);
					return;
				}
				var name = settings.selectedDir;
				insertToDb('media',name,title,vid,link,engine,false);
				this.hide();
				this.close(true);
            });
		$('#custom-menu').hide();
		$('#save_link').parent().remove();
	});
});

function getYtlinkFromClipboard() {
	var vid='';
	var text = clipboard.get('text');
	try {
		vid = text.match('.*v=(.*)?&')[1]
		return "www.youtube.com/watch?v="+vid;
	} catch(err) {
		try {
			vid = text.match('.*v=(.*)')[1];
			return "www.youtube.com/watch?v="+vid;
		} catch(err) {
			return null;
		}
	console.log('youtube id: ' + vid);
	}
}

function getSelectedText() {
	var t='';
	if(window.getSelection){
		t = window.getSelection();
	}else if(document.getSelection){
		t = document.getSelection();
	}else if(document.selection){
		t = document.selection.createRange().text;
	}
	if (t.toLocaleString() === '') {
		return null;
	} else {
		return t.toLocaleString();
	}
}
