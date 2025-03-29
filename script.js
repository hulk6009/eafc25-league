const SHEET_ID = '1MobG_dUO9okerGz6QCPsvUoRagTcDl5a';
const LEAGUE_SHEET = 'Sorted League Table';
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

const getFormIndicators = (team, fixtures) => {
  const teamFixtures = fixtures
    .filter(f => f['Home Team'] === team || f['Away Team'] === team)
    .sort((a, b) => parseInt(b['Matchday']) - parseInt(a['Matchday'])) // sort by most recent
    .slice(0, 5); // Get last 5 matches

  return teamFixtures.map(f => {
    const homeScore = f['Home Score'];
    const awayScore = f['Away Score'];

    if (homeScore === '' || awayScore === '' || homeScore == null || awayScore == null) return '';

    const isHome = f['Home Team'] === team;
    const home = parseInt(homeScore);
    const away = parseInt(awayScore);

    if (home === away) return 'D';
    return (isHome && home > away) || (!isHome && away > home) ? 'W' : 'L';
  }).filter(Boolean).reverse(); // Reverse to show most recent last
};

const populateTable = (data, tableId, fields, filter = 'all', fixtures = []) => {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = '';

  const filtered = filter === 'all' ? data : data.filter(row => 
    Object.values(row).some(val => val === filter)
  );

  filtered.forEach((row, index) => {
    const tr = document.createElement('tr');

    fields.forEach(field => {
      const td = document.createElement('td');

      if (field === 'Form' && row['Team']) {
        const formIndicators = getFormIndicators(row['Team'], fixtures);
        const formContainer = document.createElement('div');
        formContainer.className = 'form-container';

        formIndicators.forEach(indicator => {
          const span = document.createElement('span');
          span.className = `form-indicator form-${indicator === 'W' ? 'win' : indicator === 'L' ? 'loss' : 'draw'}`;
          span.textContent = indicator;
          formContainer.appendChild(span);
        });

        td.appendChild(formContainer);
      } 
      else if (field === 'Status') {
        const span = document.createElement('span');
        span.className = `status-badge ${row['Status'] === 'Completed' ? 'status-completed' : 'status-scheduled'}`;
        span.textContent = row['Status'];
        td.appendChild(span);
      }
      else if (['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].includes(field)) {
        td.textContent = row[field] || row[field] === 0 ? row[field] : '';
        if (field === 'Pts') td.className = 'important-number';
      } 
      else if (field === 'Pos') {
        td.textContent = index + 1;
      } 
      else {
        td.textContent = row[field] || '';
      }

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

  populateTable(leagueData, 'leagueTable', 
    ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts', 'Form'], 
    'all', fixtureData
  );

  populateTable(fixtureData, 'fixtureTable', 
    ['Matchday', 'Home Team', 'Score', 'Away Team', 'Status']
  );

  populateFilters(leagueData, 'teamFilter', 'Team');
  populateFilters([...new Set(fixtureData.flatMap(d => [d['Home Team'], d['Away Team']]))], 'fixtureFilter');

  document.getElementById('teamFilter').addEventListener('change', e => {
    populateTable(leagueData, 'leagueTable', 
      ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts', 'Form'], 
      e.target.value, fixtureData
    );
  });

  document.getElementById('fixtureFilter').addEventListener('change', e => {
    const filtered = e.target.value === 'all' ? fixtureData : 
      fixtureData.filter(f => f['Home Team'] === e.target.value || f['Away Team'] === e.target.value);
    populateTable(filtered, 'fixtureTable', ['Matchday', 'Home Team', 'Score', 'Away Team', 'Status']);
  });

  document.getElementById('statusFilter').addEventListener('change', e => {
    const teamFilter = document.getElementById('fixtureFilter').value;
    let filtered = fixtureData;

    if (teamFilter !== 'all') {
      filtered = filtered.filter(f => f['Home Team'] === teamFilter || f['Away Team'] === teamFilter);
    }

    if (e.target.value !== 'all') {
      filtered = filtered.filter(f => 
        (e.target.value === 'completed' && f['Status'] === 'Completed') ||
        (e.target.value === 'scheduled' && f['Status'] !== 'Completed')
      );
    }

    populateTable(filtered, 'fixtureTable', ['Matchday', 'Home Team', 'Score', 'Away Team', 'Status']);
  });
};

window.addEventListener('DOMContentLoaded', initDashboard);
