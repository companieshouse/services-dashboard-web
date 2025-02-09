
const tabTableId = 'tab-table-id';
const masterCheckboxId = 'masterCheckbox-id';
const classLevel1Checkbox = 'level1-checkbox';
const classLevel2Checkbox = 'level2-checkbox';


function initialiseTabContent() {
   initTabTable(tabTableId);
   initMenuCheckBoxes(tabTableId, masterCheckboxId, classLevel1Checkbox, classLevel2Checkbox);
   initHeaderSelects(tabTableId);
   loadTabFromState('tab-services-id', window.jsonState);
   filterTableByCheckboxes(tabTableId);
   sortTabTable();
}

function initialiseTabContent() {
   const tableId = 'tab-table-id';
}

function generateTabState() {
   console.log("generateTabState for tab-prodowner");
   const tabState = {};
   return generateState(tabState);
}

function loadTabFromState(tabId, state) {
   console.log("loadTabFromState for tab-prodowner");
}