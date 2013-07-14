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

$(document).ready(function() {
	//open related
	$(document).on('click','.load_more', function(e) {
		e.preventDefault();
		var vid = $(this).attr('alt').split('::')[2];
		var page = $(this).attr('alt').split('::')[1];
		var engine = $(this).attr('alt').split('::')[3];
		searchRelated(vid,page,eng);
	});
	
	$(document).on('click','.toggle-control-link', function(e) {
		e.preventDefault();
		var pos = $(this).position()['top'] - 100;
		var vid = $(this).attr('alt').split('::')[0];
		var engine = $(this).attr('alt').split('::')[1];
		var content = $(this).parent().find('.toggle-content').first();
		if (content.hasClass('toggled') === true) {
			if (content.hasClass('opened') === true) {
				content.removeClass('opened').addClass('closed');
				content.slideToggle();
				$(window).scrollTop(pos);
				var text = $(this).text().replace('-','+');
				$(this).html(text);
			} else {
				content.removeClass('closed').addClass('opened');
				content.slideToggle();
				$(window).scrollTop(pos);
				var text= $(this).text().replace('+','-');
				$(this).html(text);
			}
		} else {
			content.addClass('toggled');
			content.addClass('opened');
			searchRelated(vid,1,engine);
			content.slideToggle();
			$(this).html('- '+ myLocalize.translate("Open related videos"));
			$(window).scrollTop(pos);
		}
	});
});
