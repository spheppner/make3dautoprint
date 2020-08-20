/*
 * View model for OctoPrint-Make3D-Print-Queue
 *
 * Author: Simon Heppner
 * License: AGPLv3
 */

$(function() {
	function Make3DAutoPrintViewModel(parameters) {
		var self = this;
		self.params = parameters;

		self.printerState = parameters[0];
		self.loginState = parameters[1];
		self.files = parameters[2];
		self.settings = parameters[3];
		self.is_paused = ko.observable();
		self.onBeforeBinding = function() {
			self.loadQueue();
			self.is_paused(false);
		}
		
		
		self.loadQueue = function() {
			$('#queue_list').html("");
			$.ajax({
				url: "plugin/make3dautoprint/queue",
				type: "GET",
				dataType: "json",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				success:function(r){
					if (r.queue.length > 0) {
						for(var i = 0; i < r.queue.length; i++) {
							var file = r.queue[i];
							var row;
							if (file["time"] == undefined) {
								var other = "<i style='cursor: pointer' class='fa fa-chevron-down' data-index='"+i+"'></i>&nbsp; <i style='cursor: pointer' class='fa fa-chevron-up' data-index='"+i+"'></i>&nbsp;";
								if (i == 0) other = "";
								if (i == 1) other = "<i style='cursor: pointer' class='fa fa-chevron-down' data-index='"+i+"'></i>&nbsp;";
								row = $("<div style='padding: 10px;border-bottom: 1px solid #000;"+(i==0 ? "background: #f9f4c0;" : "")+"'>"+file.name+"<div class='pull-right'>" + other + "<i style='cursor: pointer' class='fa fa-minus text-error' data-index='"+i+"'></i></div></div>");
								row.find(".fa-minus").click(function() {
									self.removeFromQueue($(this).data("index"));
								});
								row.find(".fa-chevron-up").click(function() {
									self.moveUp($(this).data("index"));
								});
								row.find(".fa-chevron-down").click(function() {
									self.moveDown($(this).data("index"));
								});
							} else {
								var time = file.time / 60;
								var suffix = " mins";
								if (time > 60) {
									time = time / 60;
									suffix = " hours";
									if (time > 24) {
										time = time / 24;
										suffix = " days";
									}
								}
								
								row = $("<div style='padding: 10px; border-bottom: 1px solid #000;background:#c2fccf'>Complete: "+ file.name+ " <div class='pull-right'>took: " + time.toFixed(0) + suffix + "</div></div>")
							}
							$('#queue_list').append(row);
						}
					} else {
						$('#queue_list').html("<div style='text-align: center'>Queue is empty</div>");
					}
				}
			});
		};
			
		self.getFileList = function() {
			$('#file_list').html("");
			$.ajax({
				url: "/api/files?recursive=true",
				type: "GET",
				dataType: "json",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				success:function(r){
					var filelist = [];
					if (r.files.length > 0) {
						filelist = self.recursiveGetFiles(r.files);
					
						for(var i = 0; i < filelist.length; i++) {
							var file = filelist[i];
							var row = $("<div data-name='"+file.name.toLowerCase()+"' style='padding: 10px;border-bottom: 1px solid #000;'>"+file.path+"<div class='pull-right'><i style='cursor: pointer' class='fa fa-plus text-success' data-name='"+file.name+"' data-path='"+file.path+"' data-sd='"+(file.origin=="local" ? false : true)+"'></i></div></div>");
							row.find(".fa").click(function() {
								self.addToQueue({
									name: $(this).data("name"),
									path: $(this).data("path"),
									sd: $(this).data("sd")
								});
							});
							$('#file_list').append(row);
						}
						
					} else {
						$('#file_list').html("<div style='text-align: center'>No files found</div>");
					}
				}
			});
		}

		$(document).ready(function(){
			self.getFileList();
			
			$("#gcode_search").keyup(function() {
				var criteria = this.value.toLowerCase();
				$("#file_list > div").each(function(){
					if ($(this).data("name").indexOf(criteria) == -1) {
						$(this).hide();
					} else {
						$(this).show();
					}
				})
			});
			
			
		});
		
		
		self.recursiveGetFiles = function(files) {
			var filelist = [];
			for(var i = 0; i < files.length; i++) {
				var file = files[i];
				if (file.name.toLowerCase().indexOf(".gco") > -1 || file.name.toLowerCase().indexOf(".gcode") > -1) {
					filelist.push(file);
				} else if (file.children != undefined) {
					console.log("Getting children", self.recursiveGetFiles(file.children))
					filelist = filelist.concat(self.recursiveGetFiles(file.children));
				}
			}
			return filelist;
		}

		self.addToQueue = function(data) {
			$.ajax({
				url: "plugin/make3dautoprint/addqueue",
				type: "POST",
				dataType: "text",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				data: data,
				success: function(c) {
					self.loadQueue();
				},
				error: function() {
					self.loadQueue();
				}
			});
		}
		
		self.moveUp = function(data) {
			$.ajax({
				url: "plugin/make3dautoprint/queueup?index=" + data,
				type: "GET",
				dataType: "json",
				headers: {"X-Api-Key":UI_API_KEY},
				success: function(c) {
					self.loadQueue();
				},
				error: function() {
					self.loadQueue();
				}
			});
		}
		
		self.moveDown = function(data) {
			$.ajax({
				url: "plugin/make3dautoprint/queuedown?index=" + data,
				type: "GET",
				dataType: "json",
				headers: {"X-Api-Key":UI_API_KEY},
				success: function(c) {
					self.loadQueue();
				},
				error: function() {
					self.loadQueue();
				}
			});
		}
		
		self.removeFromQueue = function(data) {
			$.ajax({
				url: "plugin/make3dautoprint/removequeue?index=" + data,
				type: "DELETE",
				dataType: "text",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				success: function(c) {
					self.loadQueue();
				},
				error: function() {
					self.loadQueue();
				}
			});
		}

		self.startQueue = function() {
			self.is_paused(false);
			$.ajax({
				url: "plugin/make3dautoprint/startqueue",
				type: "GET",
				dataType: "json",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				data: {}
			});
		}
		
		self.resumeQueue = function() {
			self.is_paused(false)
			$.ajax({
				url: "plugin/make3dautoprint/resumequeue",
				type: "GET",
				dataType: "json",
				headers: {
					"X-Api-Key":UI_API_KEY,
				},
				data: {}
			});
		}
		
		self.printOK = function() {
			$("#print_finished_dialog").modal("hide");
			$("#print_again_dialog").modal("hide");
			$("#take_print_dialog").modal("show");
		}
		self.printNotOK = function() {
			$("#print_finished_dialog").modal("hide");
			$("#take_print_dialog").modal("hide");
			$("#print_again_dialog").modal("show");
		}
		self.printAgain = function() {
			$("#print_finished_dialog").modal("hide");
			$("#print_again_dialog").modal("hide");
			$("#take_print_dialog").modal("show");
			
			$.ajax({
				url: "plugin/make3dautoprint/printAgainFunc?pa=1",
				type: "GET",
				dataType: "json",
				headers: {"X-Api-Key":UI_API_KEY},
			});
			
		}
		self.printNotAgain = function() {
			$("#print_finished_dialog").modal("hide");
			$("#print_again_dialog").modal("hide");
			$("#take_print_dialog").modal("show");
			
			$.ajax({
				url: "plugin/make3dautoprint/printAgainFunc?pa=0",
				type: "GET",
				dataType: "json",
				headers: {"X-Api-Key":UI_API_KEY},
			});
			
		}
		self.printFinishedDialogDone = function() {
			$("#print_finished_dialog").modal("hide");
			$("#print_again_dialog").modal("hide");
			$("#take_print_dialog").modal("hide");
		}
		
		self.onDataUpdaterPluginMessage = function(plugin, data) {
			if (plugin != "make3dautoprint") return;

			var theme = 'info';
			switch(data["type"]) {
				case "popup":
					theme = "info";
					break;
				case "error":
					theme = 'danger';
					self.loadQueue();
					break;
				case "complete":
					theme = 'success';
					self.loadQueue();
					break;
				case "reload":
					theme = 'success'
					self.loadQueue();
					break;
				case "paused":
					self.is_paused(true);
					break;
				case "updatefiles":
					self.getFileList();
					break;
				case "showDialog":
					$("#print_finished_dialog").modal("show");
					break;
				case "hideDialog":
					$("#print_finished_dialog").modal("hide");
					break;
			}
			
			if (data.msg != "") {
				new PNotify({
					title: 'Make3D AutoPrint',
					text: data.msg,
					type: theme,
					hide: true,
					buttons: {
						closer: true,
						sticker: false
					}
				});
			}
		}
	}

	// This is how our plugin registers itself with the application, by adding some configuration
	// information to the global variable OCTOPRINT_VIEWMODELS
	OCTOPRINT_VIEWMODELS.push([
		// This is the constructor to call for instantiating the plugin
		Make3DAutoPrintViewModel,

		// This is a list of dependencies to inject into the plugin, the order which you request
		// here is the order in which the dependencies will be injected into your view model upon
		// instantiation via the parameters argument
		["printerStateViewModel", "loginStateViewModel", "filesViewModel", "settingsViewModel"],

		// Finally, this is the list of selectors for all elements we want this view model to be bound to.
		["#tab_plugin_make3dautoprint"]
	]);
});
