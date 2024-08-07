const { dialog } = require('electron');
const { Extension, log, INPUT_METHOD, PLATFORMS } = require('deckboard-kit');
const net = require('net');
const struct = require('python-struct');

class FxCommandExtension extends Extension {
	constructor() {
		super();
		this.name = 'Fx Command';
		this.platforms = [PLATFORMS.WINDOWS, PLATFORMS.MAC];
		this.inputs = [
			{
				label: 'Send Command',
				value: 'send-command',
				icon: 'terminal',
				color: '#34495e',
				input: [
					{
						label: 'Command',
						ref: 'command',
						type: INPUT_METHOD.INPUT_TEXT,
					},
				]
			}
		];
		this.tcpClient = null;
		this.tcpHost = '127.0.0.1'; 
		this.tcpPort = 29200; 
	}

	initTcpClient() {
		if (this.tcpClient) {
			this.tcpClient.destroy();
			this.tcpClient = null;
		}

		this.tcpClient = net.createConnection({
			port: this.tcpPort,
			host: this.tcpHost
		});

		this.tcpClient.on('error', (err) => {
			this.tcpClient = null; 
		});

		this.tcpClient.on('close', () => {
			this.tcpClient = null; 
		});
	}

	execute(action, { command }) {
		log.info(`${action} ${command}`);
		if (action === 'send-command') {
			if (!command) {
				return;
			}

			if (!this.tcpClient) {
				this.initTcpClient();
			}

			if (this.tcpClient) {
				try {
					const initialData = Buffer.from([0x43, 0x4d, 0x4e, 0x44, 0x00, 0xD2, 0x00, 0x00]);
					const endian = Buffer.from(struct.pack('!h', command.length + 13));
					const padding = Buffer.from([0x0, 0x0]);
					const commandBuffer = Buffer.from(command + '\n', 'utf8');
					const terminator = Buffer.from([0x00]);
					const messageBuffer = Buffer.concat([initialData, endian, padding, commandBuffer, terminator]);

					this.tcpClient.write(messageBuffer, (err) => {
						if (err) {
							log.error('Write Error:', err.message);
						} else {
							log.info('Message sent successfully');
						}
					});
				} catch (error) {
					log.error('Error:', error.message);
				}
			} else {
				log.error('TCP client is not initialized');
			}
		} else {
			log.error('Invalid action');
		}
	}
}

module.exports = new FxCommandExtension();
