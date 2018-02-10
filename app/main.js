const { app, BrowserWindow, ipcMain } = require('electron');
const fetch = require('node-fetch');
const path = require('path');
const url = require('url');

const clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
const Message = require('azure-iot-device').Message;
const connectionString = process.env.EdgeHubConnectionString;
const client = connectionString && clientFromConnectionString(connectionString);

let mainWindow, edgeClientConnected = false;

/*function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}*/

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 480});
    mainWindow.setKiosk(true);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }));

    client.open(function(error) {
        if(error) {
            return console.log(error);
        }
        edgeClientConnected = true;
    });

    ipcMain.on('initialize', (event, arg) => {

        setTimeout(function getTelemetry() {
            try {
                fetch('http://' + process.env.API_HOST + ':5000/data/' + process.env.RUUVITAG_MAC)
                    .then(function(result) {
                        return result.json();
                    }).then(function(data) {
                        let payload = { deviceId: 'SaunaMeter1', data, datetime: new Date().toString() };
                        event.sender.send('telemetry-data', payload);
                        if(edgeClientConnected) {
                            var message = new Message(JSON.stringify(payload));
                            //message.properties.add('loadAlert', (data.load > 70) ? 'true' : 'false');
                            console.log("Sending message: " + message.getData());
                            client.sendEvent(message);
                        }
                    });
                setTimeout(getTelemetry, 2000);
            } catch (error) {
                //Omit errors for now, because it's half expected before ruuvi-api becomes available
            }
        }, 0);
    });

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
