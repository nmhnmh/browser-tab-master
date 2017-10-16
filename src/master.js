var ping_port = null;

// Update page title with latest version number
var page_title = document.getElementsByTagName('title')[0];
page_title.textContent = page_title.textContent+' '+chrome.runtime.getManifest().version;

// fetch all active window and tabs data
var windows = [];
var groups_data = {groups: []};
const data = {windows: windows};
const new_group_data = {
  new_group_name: '',
  window_id: null,
  tab_id: null,
  url: null,
  title: null
};

function sync_all_tabs_and_windows(){
  chrome.windows.getAll(function(all){
    data.windows=all;
    for(let i=0;i<all.length;i++){
      chrome.tabs.query({windowId: all[i].id, pinned: false}, function(tabs){
        var tabs_data = [];
        for(let j=0;j<tabs.length;j++){
          //skip special chrome tabs
          let url = tabs[j].url;
          if(!url.startsWith('chrome-') && !url.startsWith('chrome://') && !url.startsWith('file://'))
            tabs_data.push({url: url, title: tabs[j].title, id: tabs[j].id});
        }
        Vue.set(data.windows[i], 'tabs', tabs_data);
      });
    }
  });
}

// keep the event page open when this page this open
// the event page will listen for tab and window change events
// and send us a message
ping_port = chrome.runtime.connect({name: 'ping'});
ping_port.postMessage({name: 'listen'});
ping_port.onMessage.addListener(function(msg){
  if(msg.name=='sync'){
    sync_all_tabs_and_windows();
  }
});

document.addEventListener('unload', function(){
  if(ping_port){
    ping_port.postMessage({name: 'unlisten'});
    ping_port.disconnect();
  }
});

// load all saved groups from storage
function load_synced_data(){
  chrome.storage.sync.get(function(data){
    if(data.groups)
      Vue.set(groups_data, 'groups', data.groups);
  });
}

chrome.storage.onChanged.addListener(function(changes, area){
  if(area=='sync'){
    load_synced_data();
  }
});

load_synced_data();

// show all active windows and tabs
sync_all_tabs_and_windows();

var windows_and_tabs = new Vue({
  el: '#windows-and-tabs',
  data: data,
  methods:{
    drag_window_tab: function(event){
      var data = event.srcElement.getAttribute('data');
      event.dataTransfer.setData("text/plain", data);
      event.dataTransfer.dropEffect = "copy";
    },
    drag_window_tab_end: function(event){
    },
    group_tab_over: function(event){
      event.preventDefault();
    },
    group_tab_enter: function(event){
      event.target.style.backgroundColor="green";
      event.target.style.color="white";
      event.preventDefault();
    },
    group_tab_leave: function(event){
      event.target.style.backgroundColor="#ddd";
      event.target.style.color="black";
    },
    group_tab_drop: function(event){
      event.target.style.backgroundColor="#ddd";
      event.target.style.color="black";

      var tab_data = JSON.parse(event.dataTransfer.getData('text'));
      // check where the drop is from
      if(tab_data.src!='group')
        return;

      // add tab to window
      ping_port.postMessage({name: 'open_tab', window: event.target.getAttribute('window-id'), url: tab_data.url});
      // remove tab from group
      for(let i=0; i<groups_data.groups.length;i++){
        let g=groups_data.groups[i];
        if(g.name==tab_data.group){
          for(let j=0;j<g.tabs.length;j++){
            if(g.tabs[j].url==tab_data.url){
              g.tabs.splice(j, 1);
              break;
            }
          }
          if(g.tabs.length==0){
            groups_data.groups.splice(i, 1);
          }
        }
      }
      // save data
      chrome.storage.sync.set({groups: groups_data.groups});
    }
  }
});


// drop zone to create new tab group
var dropzone = new Vue({
  el: '#create-new-tab-group',
  methods: {
    window_tab_drop: function(event){
      this.$el.style.border="3px dashed #ddd"
      var tab_data = JSON.parse(event.dataTransfer.getData('text'));
      //check where the drop is from
      if(!tab_data.src=='window')
        return
      new_group_data.window_id=tab_data.window_id;
      new_group_data.tab_id=tab_data.tab_id;
      new_group_data.url=tab_data.url;
      new_group_data.title=tab_data.title;
    },
    window_tab_over: function(event){
      event.preventDefault();
    },
    window_tab_enter: function(event){
      this.$el.style.border="3px dashed green"
      event.preventDefault();
    },
    window_tab_leave: function(event){
      this.$el.style.border="3px dashed #ddd"
    }
  }
});

var new_group_form = new Vue({
  el: '#new-tab-group-form',
  data: new_group_data,
  methods: {
    save: function(){
      //save new group
      groups_data.groups.push({
        name: new_group_data.new_group_name,
        tabs: [{
          url: new_group_data.url,
          title: new_group_data.title,
        }]
      });
      chrome.storage.sync.set({groups: groups_data.groups});
      //close saved tab
      ping_port.postMessage({name: 'close_tab', window: new_group_data.window_id, tab: new_group_data.tab_id})

      //clear data
      new_group_data.new_group_name='';
      new_group_data.window_id=null;
      new_group_data.tab_id=null;
      new_group_data.title=null;
      new_group_data.url=null;
    },
    cancel: function(){
      new_group_data.new_group_name='';
      new_group_data.window_id=null;
      new_group_data.tab_id=null;
      new_group_data.title=null;
      new_group_data.url=null;
    }
  }
});

var groups_list = new Vue({
  el: '#groups-list',
  data: groups_data,
  methods: {
    drag_group_tab: function(event){
      var data = event.srcElement.getAttribute('data');
      event.dataTransfer.setData("text/plain", data);
      event.dataTransfer.dropEffect = "copy";
    },
    window_tab_over: function(event){
      event.preventDefault();
    },
    window_tab_enter: function(event){
      var target=event.target;
      target.style.backgroundColor="green"
      target.style.color="white"
      event.preventDefault();
    },
    window_tab_leave: function(event){
      var target=event.target;
      target.style.backgroundColor="#ddd"
      target.style.color="black"
    },
    window_tab_drop: function(event){
      var target=event.target;
      target.style.backgroundColor="#ddd"
      target.style.color="black"
      var tab_data = JSON.parse(event.dataTransfer.getData('text'));
      //check where the drop is from
      if(!tab_data.src=='window')
        return
      var group_name = event.target.getAttribute('group-name');
      //add window tab to group
      for(let i=0; i<groups_data.groups.length;i++){
        let g=groups_data.groups[i];
        if(g.name==group_name){
          g.tabs.push({
            url: tab_data.url,
            title: tab_data.title,
          });
        }
      }
      //close window tab
      ping_port.postMessage({name: 'close_tab', tab: tab_data.tab_id});
      //save data
      chrome.storage.sync.set({groups: groups_data.groups});
    }
  }
});
