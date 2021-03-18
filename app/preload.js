const formatBytes = (bytes, decimals = 0) => {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const changeIfNewValue = (el, data) => {
	el.innerText !== data && (el.innerText = data);
};

window.addEventListener("DOMContentLoaded", () => {
	const jsBarcode = require("./js/JsBarcode.all.min.js");
	const element = document.getElementById("hardware-info");
	let stats = {};
	let dataCount = 0;

	const getGraphics = (cb) => {
		require("child_process").exec("lshw -c display | grep product:", function (error, stdout) {
			let array = [];

			stdout.split("\n").map((item) => {
				array.push(item.split(":")[1]);
			});

			if (error !== null) {
				console.log("exec error: " + error);
			} else {
				cb(array);
			}
		});
	};

	const getBatteries = (cb) => {
		require("child_process").exec("upower -e | grep battery_BAT", function (error, stdout) {
			let array = [];

			stdout
				.replace(/ +/g, "")
				.split("\n")
				.map((item) => {
					array.push(item);
				});

			if (error !== null) {
				console.log("exec error: " + error);
			} else {
				cb(array);
			}
		});
	};

	const getBatteryStats = (batPath, cb) => {
		require("child_process").exec(`upower -i ${batPath}`, function (error, stdout) {
			let object = {};

			stdout
				.replace(/ +/g, "")
				.split("\n")
				.map((item) => {
					const field = item.split(":");
					object[field[0]] = field[1];
				});

			if (error !== null) {
				console.log("exec error: " + error);
			} else {
				cb({
					id: batPath,
					capacity: {
						perc: object.capacity,
						text: `${object["energy-full"]} / ${object["energy-full-design"]}`,
					},
					voltage: object.voltage,
					energy: { wh: object.energy, perc: object.percentage },
					state: object.state === "charging" ? "(Ładowanie)" : "",
				});
			}
		});
	};

	getBatteries((batResp) => {
		stats["battery"] = [];
		batResp.forEach((batPathResp) => {
			batPathResp.length !== 0 &&
				getBatteryStats(batPathResp, (batDataResp) => {
					stats["battery"].push(batDataResp);
				});
		});
		getReady();
	});

	getGraphics((graphicsResp) => {
		let array = [];
		graphicsResp.forEach((graphResp) => {
			graphResp && array.push({ model: graphResp });
		});
		stats = {
			...stats,
			graphics: {
				...stats.graphics,
				controllers: array,
			},
		};
		getReady();
	});

	require("systeminformation")
		.get({
			cpu: "brand",
			diskLayout: "*",
			mem: "total",
			memLayout: "*",
			graphics: "displays",
			system: "model, manufacturer, serial",
		})
		.then((data) => {
			stats = {
				...stats,
				...data,
				graphics: {
					...stats.graphics,
					...data.graphics,
				},
			};
			getReady();
		});

	const getReady = () => {
		dataCount++;
		dataCount === 3 && loadStats(stats);
	};

	const loadStats = (data) => {
		const viewBarcode = (text) => {
			JsBarcode(SerialBarCode, text.replace(/[^\x00-\x7F]/g, ""));
		};

		var SerialBarCode = document.querySelector(".barcode");

		const Serial = document.createElement("li");
		Serial.innerText = "Serial: " + data.system.serial;
		Serial.onclick = () => viewBarcode(data.system.serial);
		Serial.className = "click";

		const Model = document.createElement("li");
		Model.innerText = "Model: " + data.system.model;
		Model.onclick = () => viewBarcode(data.system.model);
		Model.className = "click";

		const CPU = document.createElement("li");
		CPU.innerText = "Procesor: " + data.cpu.brand;
		CPU.onclick = () => viewBarcode(data.cpu.brand);
		CPU.className = "click";

		const Disks = document.createElement("li");
		Disks.innerText = "Dysk" + (data.diskLayout.length === 1 ? ": " : "i: ");
		data.diskLayout.map((diskData) => {
			const Disk = document.createElement("ul");
			const DiskText = document.createElement("li");
			DiskText.innerText = "PN: " + diskData.serialNum;
			DiskText.onclick = () => viewBarcode(diskData.serialNum);
			DiskText.className = "click";
			Disk.appendChild(DiskText);

			const serial = document.createElement("ul");
			serial.innerText = "Nazwa dysku: " + diskData.name;
			serial.onclick = () => viewBarcode(diskData.name);
			serial.className = "click";
			const sizeType = document.createElement("ul");
			sizeType.innerText = "Pojemność: " + Math.round(diskData.size / 1000000000) + " " + diskData.type;
			sizeType.onclick = () => viewBarcode(Math.round(diskData.size / 1000000000) + " " + diskData.type);
			sizeType.className = "click";

			const smartStatus = document.createElement("ul");
			smartStatus.innerText = "SMART status: " + diskData.smartStatus;

			Disk.appendChild(sizeType);
			Disk.appendChild(smartStatus);
			Disk.appendChild(serial);

			Disks.appendChild(Disk);
		});

		const RAM = document.createElement("li");
		const RAMText = document.createElement("a");
		RAMText.innerText = "RAM: " + formatBytes(data.mem.total);
		RAMText.onclick = () => viewBarcode(formatBytes(data.mem.total));
		RAMText.className = "click";
		RAM.appendChild(RAMText);

		data.memLayout.map((memSlotData) => {
			const Serial = document.createElement("ul");
			const SerialText = document.createElement("li");

			if (memSlotData.type !== "Empty") {
				SerialText.innerText = "PN: " + memSlotData.partNum;
				SerialText.onclick = () => viewBarcode(memSlotData.partNum);
				SerialText.className = "click";
				Serial.appendChild(SerialText);

				const SlotSize = document.createElement("ul");
				SlotSize.innerText = "Rozmiar modułu: " + formatBytes(memSlotData.size);

				Serial.appendChild(SlotSize);
			} else {
				SerialText.innerText = "Pusty slot";
				Serial.appendChild(SerialText);
			}
			RAM.appendChild(Serial);
		});

		const GPUs = document.createElement("li");
		GPUs.innerText = "Grafik" + (data.graphics.controllers.length === 1 ? "a" : "i") + ":";
		const GPUUl = document.createElement("ul");
		data.graphics.controllers.map((GPUData) => {
			const GPU = document.createElement("li");
			GPU.innerText = GPUData.model;
			GPU.onclick = () => viewBarcode(GPUData.model);
			GPU.className = "click";
			GPUUl.appendChild(GPU);
		});
		GPUs.appendChild(GPUUl);

		const Displays = document.createElement("li");
		Displays.innerText = "Wyświetlacz" + (data.graphics.displays.length !== 1 ? "e" : "") + ":";
		const DisplaysUl = document.createElement("ul");
		data.graphics.displays.map((DisplayData) => {
			const Display = document.createElement("li");
			Display.innerText = `Złącze: ${DisplayData.connection}`;

			const resolution = document.createElement("ul");
			resolution.innerText = `Rozdzielczość: ${DisplayData.currentResX}x${DisplayData.currentResY}`;
			resolution.onclick = () => viewBarcode(DisplayData.currentResX + "x" + DisplayData.currentResY);
			resolution.className = "click";

			Display.appendChild(resolution);
			DisplaysUl.appendChild(Display);
		});
		Displays.appendChild(DisplaysUl);

		const Battery = document.createElement("li");
		Battery.innerText = "Bateri" + (data.battery.length === 1 ? "a" : "e") + ":";
		const BatteriesUl = document.createElement("ul");

		data.battery.map((BatteryData) => {
			const Capacity = document.createElement("li");
			Capacity.id = BatteryData.id;
			const CapacityText = document.createElement("a");
			CapacityText.innerText = `Żywotność: ${BatteryData.capacity.perc} (${BatteryData.capacity.text})`;
			Capacity.appendChild(CapacityText);

			const Energy = document.createElement("li");
			Energy.className = "energy";
			Energy.innerText = `Poziom naładowania: ${BatteryData.energy.perc} (${BatteryData.energy.wh})`;

			const Voltage = document.createElement("li");
			Voltage.className = "voltage";
			Voltage.innerText = `Napięcie: ${BatteryData.voltage} ${BatteryData.state}`;

			const BatteryUl = document.createElement("ul");
			BatteryUl.appendChild(Energy);
			BatteryUl.appendChild(Voltage);
			Capacity.appendChild(BatteryUl);
			BatteriesUl.appendChild(Capacity);
		});

		Battery.appendChild(BatteriesUl);

		if (element) {
			element.innerHTML = "";
			element.appendChild(Serial);
			element.appendChild(Model);
			element.appendChild(CPU);
			element.appendChild(Disks);
			element.appendChild(RAM);
			element.appendChild(GPUs);
			element.appendChild(Displays);
			element.appendChild(Battery);

			JsBarcode(SerialBarCode, data.system.serial);

			window.setInterval(() => {
				getBatteries((batResp) => {
					batResp.forEach((batPathResp) => {
						batPathResp.length !== 0 &&
							getBatteryStats(batPathResp, (newBatResp) => {
								console.log(newBatResp);
								changeIfNewValue(
									document.getElementById(newBatResp.id).querySelector("a"),
									`Żywotność: ${newBatResp.capacity.perc} (${newBatResp.capacity.text})`
								);
								changeIfNewValue(
									document.getElementById(newBatResp.id).querySelector(".energy"),
									`Poziom naładowania: ${newBatResp.energy.perc} (${newBatResp.energy.wh})`
								);
								changeIfNewValue(
									document.getElementById(newBatResp.id).querySelector(".voltage"),
									`Napięcie: ${newBatResp.voltage} ${newBatResp.state}`
								);
							});
					});
				});
			}, 100);
		}
	};
});
