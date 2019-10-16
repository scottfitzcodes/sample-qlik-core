const WebSocket = require('ws');
const enigma = require('enigma.js');
const schema = require('enigma.js/schemas/3.2.json');

(async () => {
  try {
    const session = enigma.create({
      schema,
      url: 'ws://localhost/app/',
      createSocket: (url) => new WebSocket(url),
    });
    const eng = await session.open();
    const app = await eng.createSessionApp();

    await app.createConnection({
      qName: 'db',
      qConnectionString: '/db/',
      qType: 'folder',
    });
    await app.setScript(`HomeRuns:
                      LOAD * FROM [lib://db/homeruns.csv]
                      (txt, utf8, embedded labels, delimiter is ',');`);
    await app.doReload();

    const totalHomeRunsByYearObj = await app.createSessionObject({
      qInfo: { qType: 'cube'},
      qHyperCubeDef: {
                       qDimensions: [{
                                       qDef: {
                                                qFieldDefs:['Year'],
                                                qSortCriterias: [{qSortByNumeric: 1}],
                                                autoSort: false
                                       }
                       }],
                       qMeasures: [{ qDef: { 
                                             qDef: '=Sum(HomeRuns)'
                                     },
                                     qSortBy: {
                                                qSortByNumeric: -1
                                     }
                                   }],
                       qInterColumnSortOrder: [1,0],
                       qInitialDataFetch: [{ qHeight: 6, qWidth: 2 }],
    }});
    const totalHomeRunsByYearLayout = await totalHomeRunsByYearObj.getLayout();
    const totalHomeRunsByYearMatrix = totalHomeRunsByYearLayout.qHyperCube.qDataPages[0].qMatrix;
    
    console.log('Total home runs for all teams by year');
    totalHomeRunsByYearMatrix.forEach((row) => { console.log(row[0].qText + " " + row[1].qText) });

    /* second hypercube */
    const teamHomeRunsByYearObj = await app.createSessionObject({
      qInfo: { qType: 'cube'},
      qHyperCubeDef: {
                       qDimensions: [{
                                        qDef: {
                                                qFieldDefs:['Team'],
                                                qSortCriterias: [{qSortByAscii: 1}],
                                                autoSort: false
                                        }
                                      },
                                      {
                                        qDef: {
                                                qFieldDefs:['Year'],
                                                qSortCriterias: [{qSortByNumeric: 1}],
                                                autoSort: false
                                        }
                                      }
                       ],
                       qMeasures: [{ qDef: { 
                                             qDef: '=Sum(HomeRuns)'
                                     },
                                     qSortBy: {
                                                qSortByNumeric: -1
                                     }
                       }],
                       qInterColumnSortOrder: [2,1,0],
                       qInitialDataFetch: [{ qHeight: 18, qWidth: 3 }],
    }});
    const teamHomeRunsByYearLayout = await teamHomeRunsByYearObj.getLayout();
    const teamHomeRunsByYearMatrix = teamHomeRunsByYearLayout.qHyperCube.qDataPages[0].qMatrix;

    console.log('*****************************************');

    console.log('Total home runs for each teams by year');
    teamHomeRunsByYearMatrix.forEach((row) => { console.log(row[0].qText + " " + row[1].qText + " " + row[2].qText) });
    
    await session.close();
  } catch (err) {
    console.log('Error: ', err);
    process.exit(1);
  }
})();
