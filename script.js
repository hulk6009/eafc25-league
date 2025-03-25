const SHEET_ID = '1MobG_dUO9okerGz6QCPsvUoRagTcDl5a';
const LEAGUE_SHEET = 'League Table';
const FIXTURE_SHEET = 'Match Results';

const fetchSheetData = async (sheetName) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  const res = await fetch(url);
  const text = await res.text();
  const json = JSON.parse(text.substr(47).slice(0, -2));

  const cols = json.table.cols.map(c => c.label);
  const rows = json.table.rows.map(r => r.c.map(c => (c ? c.v : '')));

  return rows.map(row => Object.fromEntries(row.map((val, i) => [cols[i], val])));
};

const populateTable = (data, tableId, fields, filter = 'all') => {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = '';
  const filtered = filter === 'all' ? data : data.filter(row => Object.values(row).includes(filter));
  filtered.forEach((row, index) => {
    const tr = document.createElement('tr');
    fields.forEach((field, i) => {
      const td = document.createElement('td');
      td.textContent = field === 'Pos' ? index + 1 : row[field] || '';
      tr.appendChild(td);
    });
    tableBody.appendChild(tr);
  });
};

const populateFilters = (data, selectId, key = 'Team') => {
  const teams = [...new Set(data.map(d => d[key]))].sort();
  const select = document.getElementById(selectId);
  teams.forEach(team => {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    select.appendChild(option);
  });
};

const initDashboard = async () => {
  const leagueData = await fetchSheetData(LEAGUE_SHEET);
  const fixtureData = await fetchSheetData(FIXTURE_SHEET);

  populateTable(leagueData, 'leagueTable', ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts']);
  populateTable(fixtureData, 'fixtureTable', ['Matchday', 'Home Team', 'Away Team']);

  populateFilters(leagueData, 'teamFilter', 'Team');
  populateFilters(fixtureData.flatMap(d => [d['Home Team'], d['Away Team']]).map(t => ({ Team: t })), 'fixtureFilter');

  document.getElementById('teamFilter').addEventListener('change', e => {
    populateTable(leagueData, 'leagueTable', ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'], e.target.value);
  });

  document.getElementById('fixtureFilter').addEventListener('change', e => {
    populateTable(fixtureData, 'fixtureTable', ['Matchday', 'Home Team', 'Away Team'], e.target.value);
  });
};

window.addEventListener('DOMContentLoaded', initDashboard);
