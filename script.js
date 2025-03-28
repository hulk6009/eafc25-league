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

const populateTable = (data, tableId, fields, filter = 'all') => {
  const tableBody = document.querySelector(`#${tableId} tbody`);
  tableBody.innerHTML = '';
  const filtered = filter === 'all' ? data : data.filter(row => Object.values(row).includes(filter));
  filtered.forEach((row, index) => {
    const tr = document.createElement('tr');
    fields.forEach((field, i) => {
      const td = document.createElement('td');
      // Handle numeric fields that might be zero
      if (['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].includes(field)) {
        td.textContent = row[field] || row[field] === 0 ? row[field] : '';
      } else if (field === 'Pos') {
        td.textContent = index + 1;
      } else {
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

const calculateLeagueData = (fixtureData, leagueData) => {
  // Create a map of team stats initialized with zeros
  const teamStats = {};
  leagueData.forEach(team => {
    teamStats[team.Team] = {
      P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0
    };
  });

  // Process each fixture to update team stats
  fixtureData.forEach(match => {
    if (!match['Home Team'] || !match['Away Team']) return;

    const homeTeam = match['Home Team'];
    const awayTeam = match['Away Team'];
    const homeGoals = parseInt(match['Home Goals'] || 0);
    const awayGoals = parseInt(match['Away Goals'] || 0);

    // Update games played
    teamStats[homeTeam].P += 1;
    teamStats[awayTeam].P += 1;

    // Update goals for and against
    teamStats[homeTeam].GF += homeGoals;
    teamStats[homeTeam].GA += awayGoals;
    teamStats[awayTeam].GF += awayGoals;
    teamTeam[awayTeam].GA += homeGoals;

    // Update goal difference
    teamStats[homeTeam].GD = teamStats[homeTeam].GF - teamStats[homeTeam].GA;
    teamStats[awayTeam].GD = teamStats[awayTeam].GF - teamStats[awayTeam].GA;

    // Update wins/losses/draws and points
    if (homeGoals > awayGoals) {
      teamStats[homeTeam].W += 1;
      teamStats[homeTeam].Pts += 3;
      teamStats[awayTeam].L += 1;
    } else if (homeGoals < awayGoals) {
      teamStats[awayTeam].W += 1;
      teamStats[awayTeam].Pts += 3;
      teamStats[homeTeam].L += 1;
    } else {
      teamStats[homeTeam].D += 1;
      teamStats[awayTeam].D += 1;
      teamStats[homeTeam].Pts += 1;
      teamStats[awayTeam].Pts += 1;
    }
  });

  // Merge with existing league data
  return leagueData.map(team => ({
    ...team,
    ...teamStats[team.Team]
  }));
};

const initDashboard = async () => {
  const leagueData = await fetchSheetData(LEAGUE_SHEET);
  const fixtureData = await fetchSheetData(FIXTURE_SHEET);

  // Calculate proper stats based on fixtures
  const calculatedLeagueData = calculateLeagueData(fixtureData, leagueData);

  populateTable(calculatedLeagueData, 'leagueTable', ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts']);
  populateTable(fixtureData, 'fixtureTable', ['Matchday', 'Home Team', 'Home Goals', 'Away Goals', 'Away Team']);

  populateFilters(calculatedLeagueData, 'teamFilter', 'Team');
  populateFilters(fixtureData.flatMap(d => [d['Home Team'], d['Away Team']]).map(t => ({ Team: t })), 'fixtureFilter');

  document.getElementById('teamFilter').addEventListener('change', e => {
    populateTable(calculatedLeagueData, 'leagueTable', ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'], e.target.value);
  });

  document.getElementById('fixtureFilter').addEventListener('change', e => {
    populateTable(fixtureData, 'fixtureTable', ['Matchday', 'Home Team', 'Home Goals', 'Away Goals', 'Away Team'], e.target.value);
  });
};

window.addEventListener('DOMContentLoaded', initDashboard);
