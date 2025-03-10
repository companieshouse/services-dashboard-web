import { Tab } from './main.js';

const tabId = 'tab-prodowner-id';
const tabTableId = 'tab-table-id';
const masterCheckboxId = 'masterCheckbox-id';
const classLevel1Checkbox = 'level1-checkbox';
const classLevel2Checkbox = 'level2-checkbox';

function initialiseTabContent() {
   initSortDirection();
   initTabTable(tabTableId);
   initMenuCheckBoxes(tabTableId, masterCheckboxId, classLevel1Checkbox, classLevel2Checkbox);
   loadTabFromState(tabId, window.jsonState);
   filterTableByCheckboxes(tabTableId);
   sortTabTable(lastSortedColumnId);
}

function generateTabState() {
   console.log("generateTabState for tab-prodowner");
   return generateTabCheckboxesState(classLevel1Checkbox, classLevel2Checkbox);
}

function loadTabFromState(tabId, state) {
   console.log("loadTabFromState for tab-prodowner");
   loadTabCheckboxesFromState(tabId, state, classLevel1Checkbox, classLevel2Checkbox, masterCheckboxId);
}

const tabProdowner = new Tab(initialiseTabContent, generateTabState, loadTabFromState);

export default tabProdowner;