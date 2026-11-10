/*document.getElementById('refreshPageBtn').addEventListener('click', (e) => {
			if (!confirm(`确定要刷新页面吗？`)) return;
			location.reload();
        });*/
		var closeWebview = (e) => {
			if (!confirm(`确定要返回首页吗？`)) return;
			plus.webview.currentWebview().close();
			//location.pathname = '';
        };
		document.getElementById('backHomeBtn').addEventListener('click', (e) => {
			closeWebview();
		});
		window.onerror = function (message, source, lineno, colno, error) {
			const errorDisplay = `
				<h3>发生错误</h3>
				<p><strong>消息:</strong> ${message}</p>
				<p><strong>文件:</strong> ${source}</p>
				<p><strong>行号:</strong> ${lineno}:${colno}</p>
				${error ? `<p><strong>堆栈:</strong> ${error.stack}</p>` : ''}
			`;

			const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line error-output`;
			line.innerHTML = errorDisplay;
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;

			// 返回true阻止默认错误处理
			return true;
		};

		window.addEventListener('unhandledrejection', event => {
			const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line error-output`;
			line.innerHTML = `未处理的Promise拒绝: ${event.reason}`;
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;
			// 可选: 防止默认控制台错误输出
			//event.preventDefault();
		});

		// 保存原始的 console 方法
		const originalConsole = {
			log: console.log,
			info: console.info,
			warn: console.warn,
			error: console.error,
			clear: console.clear
		};

		// 格式化输出
		function formatOutput(args) {
			let output = '';
			for (let i = 0; i < args.length; i++) {
				if (typeof args[i] === 'object') {
					output += JSON.stringify(args[i], null, 2) + ' ';
				} else {
					output += args[i] + ' ';
				}
			}
			const now = new Date();
			const timeStr = now.toTimeString().substr(0, 8);
			return `<span class="timestamp">[${timeStr}]</span> ${output}`;
		}

		// 重写 console 方法
		console.log = function () {
			originalConsole.log.apply(console, arguments);
			const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line info-output`;
			line.innerHTML = formatOutput(arguments);
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;
		};

		console.info = function() {
            originalConsole.info.apply(console, arguments);
            const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line info-output`;
			line.innerHTML = formatOutput(arguments);
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };

        console.warn = function() {
            originalConsole.warn.apply(console, arguments);
            const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line warn-output`;
			line.innerHTML = formatOutput(arguments);
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };

        console.error = function() {
            originalConsole.error.apply(console, arguments);
            const consoleOutput = document.getElementById('consoleOutput');
			const line = document.createElement('div');
			line.className = `console-line error-output`;
			line.innerHTML = formatOutput(arguments);
			consoleOutput.appendChild(line);
			consoleOutput.scrollTop = consoleOutput.scrollHeight;
        };

        console.clear = function() {
            originalConsole.clear.apply(console);
        };

		const script = document.createElement("script");
		script.src = R1Config.assetUrl("assets/js/tools/adb-console.js") + "?t=" + Date.now();
		document.body.appendChild(script);
