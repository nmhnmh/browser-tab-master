var master_url = chrome.runtime.getURL('master.html');
var ping_port = null;

chrome.browserAction.onClicked.addListener(function(tab){
	chrome.tabs.create({url: master_url});
});

chrome.runtime.onConnect.addListener(function(port){
  if(port.name=='ping'){
    ping_port=port;
    ping_port.onMessage.addListener(function(msg){
      if(msg.name=='listen'){
        listen_for_changes();
      } else if (msg.name=='unlisten'){
        unlisten_for_changes();
      } else if (msg.name=='close_tab'){
        chrome.tabs.remove(msg.tab);
      } else if (msg.name=='open_tab'){
        chrome.tabs.create({windowId: Math.round(parseInt(msg.window)), url: msg.url, active: false});
      }
    });
  }
});

function ping_page(){
  chrome.tabs.query({url: master_url}, function(results){
    if(results.length>0){
      let tab = results[0];
      if(tab){
        if(ping_port){
          console.log('ping page');
          ping_port.postMessage({name: 'sync'});
        }
      } else {
        console.error("Master tab is not found!");
      }
    }
  });
}

function listen_for_changes(){
  chrome.tabs.onCreated.addListener(ping_page);
  chrome.tabs.onUpdated.addListener(ping_page);
  chrome.tabs.onMoved.addListener(ping_page);
  chrome.tabs.onReplaced.addListener(ping_page);
  chrome.tabs.onDetached.addListener(ping_page);
  chrome.tabs.onAttached.addListener(ping_page);
  chrome.tabs.onRemoved.addListener(ping_page);
  chrome.windows.onCreated.addListener(ping_page);
  chrome.windows.onRemoved.addListener(ping_page);
}

function unlisten_for_changes(){
  chrome.tabs.onCreated.addListener(null);
  chrome.tabs.onUpdated.addListener(null);
  chrome.tabs.onMoved.addListener(null);
  chrome.tabs.onReplaced.addListener(null);
  chrome.tabs.onDetached.addListener(null);
  chrome.tabs.onAttached.addListener(null);
  chrome.tabs.onRemoved.addListener(null);
  chrome.windows.onCreated.addListener(null);
  chrome.windows.onRemoved.addListener(null);
}
