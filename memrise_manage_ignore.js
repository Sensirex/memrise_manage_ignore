// ==UserScript==
// @name           Manage ignored words for Memrise
// @namespace      https://github.com/sensirex
// @description    You can manage ignored words
// @match          https://www.memrise.com/course/*/*/
// @version        0.0.1
// @updateURL      https://github.com/sensirex/memrise_manage_ignore/raw/master/memrise_manage_ignore.js
// @downloadURL    https://github.com/sensirex/memrise_manage_ignore/raw/master/memrise_manage_ignore.js
// @author         Sensirex
// @grant          none
// ==/UserScript==


(function() {
    'use strict';

	function getCourseName(courseId){
		const url = `https://www.memrise.com/ajax/session/?course_id=${courseId}&level_index=1&session_slug=preview`;
		return fetch(url, { credentials: 'same-origin' })
			    .then(res => {
					// console.log(res)
					return res.status === 200
	          				? (res.json().then(data_json=>{
								  return data_json.session.course.name;
							})) : undefined;
				});
	}

    var p=/^https:\/\/www.memrise.com\/course\/\d*\/[^/]*\/$/;
    if(!p.test(location.href))return;
	const courseId = location.href.slice(30).match(/\d+/)[0];
	var course_name="";
	getCourseName(courseId).then(name=>{course_name=name;});
	var panel=$(`
			<style>
				.panel-mai {
				position: absolute;
				    top: 77px;
				    left: 5px;
				    background: #fff;
				    border: 1px solid #eee;
				    border-radius: 3px;
				    padding: 10px 15px;
				}
				.panel-mai button {
				display: block;
				    float: none;
				    margin: 0;
				    margin-bottom: 10px;
				    font-size: 10px;
				    width: 40px;
				    height: auto;
				    padding: 0 10px;
				}
				.panel-mai button:disabled {
				    color:#aaa;
				    opacity: .6;
				}
				.panel-mai button:last-child {margin-bottom:0;}
				span.mai-working {
				    position: absolute;
				    background: red;
				    width: 10px;
				    height: 10px;
				    border-radius: 5px;
				    top: 3px;
				    right: 3px;
				    animation-name: mai-working-animate;
				    animation-duration: 1s;
				    animation-iteration-count: infinite;
				}
				@keyframes mai-working-animate {
				    0%{opacity:0;}
				    50%{opacity:1;}
				    100%{opacity:0;}
				}
			</style>
			<div class="panel-mai">
				<button data-type="D+" title="Add words of the course to dictionary">D+</button>
				<button data-type="D-" title="Remove words of the course from dictionary">D-</button>
				<button data-type="DC" title="Clear dictionary">DC</button>

				<button data-type="MI" title="Hold on memory the ignored words of the course">MI</button>
				<button data-type="MC" title="Remove the ignored words of the course from memory">MC</button>
				<button data-type="M+" title="Ignore all words of the course that there are in memory">M+</button>
				<button data-type="M-" title="Don't ignore all words of the course that there are in memory">M-</button>

				<button data-type="I+" title="Ignore words of the course that there are not in dictionary">I+</button>
				<button data-type="I-" title="Ignore words of the course that there are in dictionary">I-</button>
				<button data-type="IA" title="Ignore all words of the course">IA</button>
				<button data-type="IU" title="Don't ignore all words of the course">IU</button>
				<button data-type="I" title="Show courses in the dictionary">I</button>
				<span></span>
			</div>`);


	var mai_data={
			courses:{},
			dictionary:{},
			ignore_memory:{}
		};


	function save_data(){
		localStorage.mai_script_data=JSON.stringify(mai_data);
	}

	if(localStorage.mai_script_data==undefined)
		save_data();
	else{
		mai_data=JSON.parse(localStorage.mai_script_data);
	}
	if(mai_data.courses==undefined)				{mai_data.courses={};save_data();}
	if(mai_data.dictionary==undefined)			{mai_data.dictionary={};save_data();}
	if(mai_data.ignore_memory==undefined)		{mai_data.ignore_memory={};save_data();}

	function objLen(obj){
		var len=0;
		for(var i in obj)len++;
		return len;
	}

	function prepare_sentence(sentence){
		return sentence.toLowerCase().replace(/(the\s+|a\s+|an\s+|to\s+)/g,'').
		// sentence.toLowerCase().replace(//g,'').
		replace(/[?\.,!]/g,' ').
		replace(/\s\s/g,' ').
		replace(/i'm/g,'i am').
		replace(/you're/g,'you are').
		replace(/he's/g,'he is').
		replace(/she's/g,'she is').
		replace(/it's/g,'it is').
		replace(/we're/g,'we are').
		// .replace(/they're/g,'they are').
		replace(/don't/g,'do not').
		replace(/doesn't/g,'does not').
		replace(/won't/g,'will not').
		replace(/wouldn't/g,'would not').
		replace(/wasn't/g,'was not').
		replace(/weren't/g,'were not').
		replace(/isn't/g,'is not').
		replace(/aren't/g,'are not').
		replace(/(.)'ll/g,'$1 will').
		trim();
	}
	// var getWords_cahce=undefined;
	function getWords(courseId, level,nocache) {
		// if(!nocache&&getWords_cahce)return getWords_cahce;
	    const url = `https://www.memrise.com/ajax/session/?course_id=${courseId}&level_index=${level}&session_slug=preview`;
	    // console.log('Fetching words from ' + url)
	    return fetch(url, { credentials: 'same-origin' })
	      // parse response
	      .then(res => {
	        return res.status === 200
	          ? (res.json()
	            // map results
	            .then(data => {
	              return Object.keys(data.learnables).map(key => ({
					course_id:		courseId,
					thing_id: 		data.learnables[key].thing_id,
					column_a: 		data.thingusers[key]?data.thingusers[key].column_a:1,
					column_b: 		data.thingusers[key]?data.thingusers[key].column_b:2,
	                original: 		data.learnables[key].item.value,
	                translation: 	data.learnables[key].definition.value,
					ignored:		data.thingusers[key]?data.thingusers[key].ignored:false,
	              }));
	            })
	            .then(words => {
					// getWords_cahce=words;
	              	return getWords(courseId, level + 1)
	                		.then(words.concat.bind(words));
	            })
				)
	          : [];
	    })
	    .catch(err => {
	    //   console.error(err);
	      return [];
	    });
	}

	function updateBtns(){
		if(mai_data.courses[courseId]!=undefined){
			panel.find('button[data-type="D+"]').prop('disabled',true);
			panel.find('button[data-type="D-"]').prop('disabled',false);
		}
		else{
			panel.find('button[data-type="D+"]').prop('disabled',false);
			panel.find('button[data-type="D-"]').prop('disabled',true);
		}
		if(objLen(mai_data.courses)==0){
			panel.find('button[data-type="I+"]').prop('disabled',true);
			panel.find('button[data-type="I-"]').prop('disabled',true);
			panel.find('button[data-type="DC"]').prop('disabled',true);
		}
		else{
			panel.find('button[data-type="I+"]').prop('disabled',false);
			panel.find('button[data-type="I-"]').prop('disabled',false);
			panel.find('button[data-type="DC"]').prop('disabled',false);
		}
		if(mai_data.ignore_memory[courseId]==undefined){
			panel.find('button[data-type="MI"]').prop('disabled',false);
			panel.find('button[data-type="MC"]').prop('disabled',true);
			panel.find('button[data-type="M+"]').prop('disabled',true);
			panel.find('button[data-type="M-"]').prop('disabled',true);
		}
		else{
			panel.find('button[data-type="MI"]').prop('disabled',true);
			panel.find('button[data-type="MC"]').prop('disabled',false);
			panel.find('button[data-type="M+"]').prop('disabled',false);
			panel.find('button[data-type="M-"]').prop('disabled',false);
		}
	}

	function workBegin(){
		panel.find('span').addClass('mai-working');
		panel.find('button').prop('disabled',true);
	}

	function workEnd(){
		panel.find('span').removeClass('mai-working');
		panel.find('button').prop('disabled',false);
	}



    $(document).ready(function(){

		$('body').append(panel);
		updateBtns();
		panel.find('button[data-type="D+"]').click(function(){
			//Add words of the course to dictionary
			workBegin();
			getWords(courseId, 1)
			.then(words => {
				mai_data.courses[courseId]=course_name;
				for(var i in words)
					mai_data.dictionary[words[i].thing_id]=words[i];
				save_data();
				workEnd();
				updateBtns();
			});
		});
		panel.find('button[data-type="D-"]').click(function(){
			//Remove words of the course from dictionary
			workBegin();
			delete mai_data.courses[courseId];
			var removes=[];
			for(var i in mai_data.dictionary)
				if(mai_data.dictionary[i].course_id==courseId)
					removes.push(i);
			for(var i in removes)delete mai_data.dictionary[removes[i]];
			save_data();
			workEnd();
			updateBtns();
		});
		panel.find('button[data-type="DC"]').click(function(){
			//Clear dictionary
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want to cleardictionary?',function(){
				workBegin();
				mai_data.courses={};
				mai_data.dictionary={};
				save_data();
				workEnd();
				updateBtns();
			});

		});
		panel.find('button[data-type="MI"]').click(function(){
			//Hold on memory the ignored words of the course
			workBegin();
			mai_data.ignore_memory[courseId]={};
			getWords(courseId, 1)
    		.then(words => {

				for(var i in words)
					if(words[i].ignored)
						mai_data.ignore_memory[courseId][words[i].thing_id]=words[i];

				save_data();
				workEnd();
				updateBtns();

			});
		});
		panel.find('button[data-type="MC"]').click(function(){
			//Remove the ignored words of the course from memory
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want to remove the ignored words of the course from memory?',function(){
				workBegin();
				delete mai_data.ignore_memory[courseId];
				save_data();
				workEnd();
				updateBtns();
			});
		});
		panel.find('button[data-type="M+"]').click(function(){
			//Ignore all words of the course that there are in memory
			var ignore_data=[];
			var ignore=mai_data.ignore_memory[courseId];
			if(ignore==undefined)return;
			workBegin();
			for(var i in ignore)
				ignore_data.push({
					thing_id	: ignore[i].thing_id,
					column_a	: ignore[i].column_a,
					column_b	: ignore[i].column_b,
					ignored		: true,
				});
			$.ajax({
			    url: '/api/thinguser/ignore/',
			    type: 'POST',
			    data: {
			        ignore_data: JSON.stringify(ignore_data)
			    },
			    success: function() {
					MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
					workEnd();
					updateBtns();
			    }
			}).fail(function(){
				MEMRISE.modal.info('Manage ignored words','There is some critical errors');
				workEnd();
				updateBtns();
			});
		});
		panel.find('button[data-type="M-"]').click(function(){
			//Don't ignore all words of the course that there are in memory
			var ignore_data=[];
			var ignore=mai_data.ignore_memory[courseId];
			if(ignore==undefined)return;
			workBegin();
			for(var i in ignore)
				ignore_data.push({
					thing_id	: ignore[i].thing_id,
					column_a	: ignore[i].column_a,
					column_b	: ignore[i].column_b,
					ignored		: false,
				});
			$.ajax({
			    url: '/api/thinguser/ignore/',
			    type: 'POST',
			    data: {
			        ignore_data: JSON.stringify(ignore_data)
			    },
			    success: function() {
					MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
					workEnd();
					updateBtns();
			    }
			}).fail(function(){
				MEMRISE.modal.info('Manage ignored words','There is some critical errors');
				workEnd();
				updateBtns();
			});
		});

		panel.find('button[data-type="I+"]').click(function(){
			//Ignore all words of the course that are not in dictionary
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want to ignore all words of the course that there are not in dictionary? This action will have reset current ignored words that will be ignore',function(){
				workBegin();
				getWords(courseId, 1)
				.then(words => {
					var ignore_data=[];
					var dictionary=[];
					for(var i in mai_data.dictionary)
						dictionary.push(prepare_sentence(mai_data.dictionary[i].original));
					for(var i in words){
						var word=prepare_sentence(words[i].original);
						if(dictionary.indexOf(word)==-1){
							ignore_data.push({
								thing_id	: words[i].thing_id,
								column_a	: words[i].column_a,
								column_b	: words[i].column_b,
								ignored		: true,
							});
						}
					}
					$.ajax({
					    url: '/api/thinguser/ignore/',
					    type: 'POST',
					    data: {
					        ignore_data: JSON.stringify(ignore_data)
					    },
					    success: function() {
							MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
							workEnd();
							updateBtns();
					    }
					}).fail(function(){
						MEMRISE.modal.info('Manage ignored words','There is some critical errors');
						workEnd();
						updateBtns();
					});
				});
			});
		});
		panel.find('button[data-type="I-"]').click(function(){
			//Ignore all words of the course that are in dictionary
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want to ignore all words of the course that there are in dictionary? This action will have reset current ignored words that will be ignore',function(){
				workBegin();
				getWords(courseId, 1)
				.then(words => {
					var ignore_data=[];
					var dictionary=[];
					for(var i in mai_data.dictionary)
						dictionary.push(prepare_sentence(mai_data.dictionary[i].original));
					for(var i in words){
						var word=prepare_sentence(words[i].original);
						if(dictionary.indexOf(word)!=-1){
							ignore_data.push({
								thing_id	: words[i].thing_id,
								column_a	: words[i].column_a,
								column_b	: words[i].column_b,
								ignored		: true,
							});
						}
					}
					$.ajax({
					    url: '/api/thinguser/ignore/',
					    type: 'POST',
					    data: {
					        ignore_data: JSON.stringify(ignore_data)
					    },
					    success: function() {
							MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
							workEnd();
							updateBtns();
					    }
					}).fail(function(){
						MEMRISE.modal.info('Manage ignored words','There is some critical errors');
						workEnd();
						updateBtns();
					});
				});
			});
		});
		panel.find('button[data-type="IA"]').click(function(){
			//Ignore all words of the course
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want to ignore all words of the course? This action will be ignore all words',function(){
				workBegin();
				getWords(courseId, 1)
				.then(words => {
					var ignore_data=[];
					for(var i in words)
						ignore_data.push({
							thing_id	: words[i].thing_id,
							column_a	: words[i].column_a,
							column_b	: words[i].column_b,
							ignored		: true,
						});
					$.ajax({
					    url: '/api/thinguser/ignore/',
					    type: 'POST',
					    data: {
					        ignore_data: JSON.stringify(ignore_data)
					    },
					    success: function() {
							MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
							workEnd();
							updateBtns();
					    }
					}).fail(function(){
						MEMRISE.modal.info('Manage ignored words','There is some critical errors');
						workEnd();
						updateBtns();
					});
				});
			});
		});
		panel.find('button[data-type="IU"]').click(function(){
			//Don't ignore all words of the course
			MEMRISE.modal.yes_no('Dictionary management','Are you sure that you want don\'t ignore all words of the course? This action will reset an ignore',function(){
				workBegin();
				getWords(courseId, 1)
				.then(words => {
					var ignore_data=[];
					for(var i in words)
						ignore_data.push({
							thing_id	: words[i].thing_id,
							column_a	: words[i].column_a,
							column_b	: words[i].column_b,
							ignored		: false,
						});
					$.ajax({
					    url: '/api/thinguser/ignore/',
					    type: 'POST',
					    data: {
					        ignore_data: JSON.stringify(ignore_data)
					    },
					    success: function() {
							MEMRISE.modal.info('Manage ignored words','Ignoring complete, check it please. Changes: '+ignore_data.length);
							workEnd();
							updateBtns();
					    }
					}).fail(function(){
						MEMRISE.modal.info('Manage ignored words','There is some critical errors');
						workEnd();
						updateBtns();
					});
				});
			});
		});
		panel.find('button[data-type="I"]').click(function(){
			var content='';
			for(var i in mai_data.courses){
				var cnt=0;
				for(var j in mai_data.dictionary)if(mai_data.dictionary[j].course_id==i)cnt++;
				content+=`${mai_data.courses[i]} (${cnt})<br>`;
			}
			content+=`<br>Dictionary size: ${objLen(mai_data.dictionary)}`;
			if(mai_data.ignore_memory[courseId]==undefined)
				content+=`<br>Ignored words of the course in the memory: none`;
			else{
				content+=`<br>Ignored words of the course in the memory: ${objLen(mai_data.ignore_memory[courseId])}`;
			}
			MEMRISE.modal.info('Courses in the dictionary',content);
		});

    });
})();
