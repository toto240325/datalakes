/**
 * PoC: Test the OP Portal Search API - Who-is-Who (WIW) endpoints
 * 
 * Goal: Determine if this API provides useful data for our EC Directory project.
 * Specifically: does it return people below Head of Unit level?
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const BASE_URL = 'https://search.publications.europa.eu/API/search/1.0';
const AUTH = Buffer.from('digit:hV1z5JRuFxB43ZOuqZ!t').toString('base64');

// Corporate proxy  
const PROXY_HOST = 'proxy-t2-bx.welcome.ec.europa.eu';
const PROXY_PORT = 8012;
const PROXY_AUTH = Buffer.from('derruer:clerMa06').toString('base64');

function apiCall(endpoint, params) {
  return new Promise((resolve, reject) => {
    // Build multipart/form-data body
    const boundary = '----FormBoundary' + Date.now();
    let body = '';
    for (const [key, value] of Object.entries(params)) {
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="${key}"\r\n\r\n`;
      body += `${value}\r\n`;
    }
    body += `--${boundary}--\r\n`;

    const targetUrl = `${BASE_URL}/${endpoint}`;
    
    // CONNECT tunnel through proxy
    const proxyReq = http.request({
      host: PROXY_HOST,
      port: PROXY_PORT,
      method: 'CONNECT',
      path: 'search.publications.europa.eu:443',
      headers: {
        'Proxy-Authorization': `Basic ${PROXY_AUTH}`
      }
    });

    proxyReq.setTimeout(15000, () => {
      proxyReq.destroy();
      reject(new Error('Proxy CONNECT timeout'));
    });

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }

      const options = {
        hostname: 'search.publications.europa.eu',
        port: 443,
        path: `/API/search/1.0/${endpoint}`,
        method: 'POST',
        headers: {
          'Authorization': `Basic ${AUTH}`,
          'Accept': 'application/json',
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': Buffer.byteLength(body)
        },
        socket: socket,
        agent: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[${endpoint}] Status: ${res.statusCode}`);
          if (res.statusCode >= 200 && res.statusCode < 400) {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              resolve(data);
            }
          } else {
            console.log(`Response: ${data.substring(0, 1000)}`);
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });
      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout (15s)'));
      });
      req.on('error', (e) => {
        console.log(`Request error: ${e.message}`);
        reject(e);
      });
      req.write(body);
      req.end();
    });

    proxyReq.on('error', (e) => {
      console.log(`Proxy error: ${e.message} | code: ${e.code}`);
      reject(e);
    });

    proxyReq.end();
  });
}

async function main() {
  console.log('=== PoC: OP Portal Search API - WIW endpoints ===\n');

  // Test 1: Search for persons in DIGIT (our DG)
  console.log('--- Test 1: Search persons in DIGIT ---');
  try {
    const result = await apiCall('wiw/simple_json', {
      q: '*',
      hlan: 'ENG',
      'filter.collection': 'person',
      'filter.institution': 'http://publications.europa.eu/resource/authority/corporate-body/COM',
      ps: '5',
      'filter.status': 'http://publications.europa.eu/resource/authority/concept-status/CURRENT'
    });
    console.log(`Total results: ${result?.results?.total || 'N/A'}`);
    if (result?.results?.docs) {
      for (const doc of result.results.docs.slice(0, 3)) {
        console.log(`  - ${JSON.stringify(doc, null, 2).substring(0, 500)}`);
      }
    } else if (result?.results?.items) {
      console.log(JSON.stringify(result.results.items, null, 2).substring(0, 2000));
    } else {
      console.log(JSON.stringify(result, null, 2).substring(0, 2000));
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 2: Search for a specific person (e.g. "derruine")
  console.log('\n--- Test 2: Search for "derruine" ---');
  try {
    const result = await apiCall('wiw/simple_json', {
      q: 'derruine',
      hlan: 'ENG',
      'filter.collection': 'person',
      ps: '5'
    });
    console.log(`Total results: ${result?.results?.total || 'N/A'}`);
    console.log(JSON.stringify(result, null, 2).substring(0, 2000));
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 3: Search for organizations in DIGIT
  console.log('\n--- Test 3: Search organizations "DIGIT" ---');
  try {
    const result = await apiCall('wiw/simple_json', {
      q: 'DIGIT',
      hlan: 'ENG',
      'filter.collection': 'organization',
      ps: '10'
    });
    console.log(`Total results: ${result?.results?.total || 'N/A'}`);
    console.log(JSON.stringify(result, null, 2).substring(0, 2000));
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }

  // Test 4: Check what positions are returned (management level?)
  console.log('\n--- Test 4: Search persons in DIGIT with org hierarchy ---');
  try {
    const result = await apiCall('wiw/simple_json', {
      q: '*',
      hlan: 'ENG',
      'filter.collection': 'person',
      'q.organisationHierarchy': 'http://publications.europa.eu/resource/authority/corporate-body/COM|http://publications.europa.eu/resource/authority/corporate-body/DIGIT',
      ps: '50'
    });
    console.log(`Total results: ${result?.results?.total || 'N/A'}`);
    // Show positions/roles to understand the level of detail
    const docs = result?.results?.docs || [];
    console.log(`Got ${docs.length} results`);
    for (const doc of docs.slice(0, 10)) {
      const name = doc.combinedNames?.[0]?.text || doc.givenName + ' ' + doc.familyName || 'unknown';
      const positions = doc.memberships?.map(m => m.combinedPositions?.[0]?.text) || [];
      console.log(`  ${name} — ${positions.join(', ')}`);
    }
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

main().catch(console.error);
