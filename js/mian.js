// ==================== 移动端错误捕获 ====================
window.onerror = function(message, source, lineno, colno, error) {
	var errorMsg = "错误: " + message + "\n文件: " + source + "\n行号: " + lineno;
	console.error(errorMsg);

	// 在移动端显示错误
	var errorDiv = document.getElementById('mobile-error-display');
	if (errorDiv) {
		errorDiv.style.display = 'block';
		errorDiv.innerHTML = errorMsg.replace(/\n/g, '<br>');
	} else {
		alert(errorMsg);
	}
	return false;
};
// ==================== 错误捕获结束 ====================

// 难度配置
var LEVEL_CONFIG = {
	1: { gameTime: 60, secsMin: 550, secsMax: 850, stayMin: 200, stayMax: 300 },
	2: { gameTime: 60, secsMin: 500, secsMax: 800, stayMin: 150, stayMax: 250 },
	3: { gameTime: 60, secsMin: 450, secsMax: 750, stayMin: 100, stayMax: 200 }
};
var currentLevel = 2; // 默认中等难度

// 全局定时器管理变量
var gameTiming = null;    // 倒计时 interval ID
var gameCircle = null;    // 狼生成 interval ID
var gameEndTime = null;   // 游戏结束时间戳

// ==================== 游戏数据记录模块 ====================
// 用途：记录玩家所有点击事件，并在游戏结束时导出为 CSV 文件
var GameTracker = {
	isTracking: false,           // 是否正在记录
	startTime: 0,                // 游戏开始时间（performance.now()）
	clickData: [],               // 存储所有点击数据
	clickCounter: 0,             // 点击计数器

	// 初始化 - 在游戏开始时调用
	init: function() {
		this.isTracking = true;
		this.startTime = performance.now();
		this.clickData = [];
		this.clickCounter = 0;
		console.log("GameTracker: 数据记录已启动");
	},

	// 记录点击事件 - 在每次点击时调用
	recordClick: function(x, y, targetInfo) {
		if (!this.isTracking) return;

		var currentTime = performance.now();
		var relativeTime = currentTime - this.startTime;
		this.clickCounter++;

		// 计算点击频率（当前点击距离上一次点击的时间间隔）
		var frequency = 0;
		if (this.clickData.length > 0) {
			var lastClick = this.clickData[this.clickData.length - 1];
			frequency = relativeTime - lastClick.Relative_Time_ms;
		}

		var record = {
			Click_Number: this.clickCounter,
			Relative_Time_ms: Math.round(relativeTime),
			X_Coordinate: Math.round(x),
			Y_Coordinate: Math.round(y),
			Target_Info: targetInfo || 'background',
			Click_Interval_ms: Math.round(frequency)
		};

		this.clickData.push(record);
	},

	// 停止记录 - 在游戏结束时调用
	stop: function() {
		this.isTracking = false;
		console.log("GameTracker: 数据记录已停止，共记录 " + this.clickData.length + " 次点击");
	},

	// 生成统计报告
	generateReport: function() {
		if (this.clickData.length === 0) {
			return {
				total_clicks: 0,
				message: "无点击数据"
			};
		}

		// 计算点击间隔统计
		var intervals = [];
		for (var i = 1; i < this.clickData.length; i++) {
			intervals.push(this.clickData[i].Relative_Time_ms - this.clickData[i - 1].Relative_Time_ms);
		}

		var sum = intervals.reduce(function(a, b) { return a + b; }, 0);
		var mean = intervals.length > 0 ? sum / intervals.length : 0;
		var min = intervals.length > 0 ? Math.min.apply(null, intervals) : 0;
		var max = intervals.length > 0 ? Math.max.apply(null, intervals) : 0;

		return {
			total_clicks: this.clickData.length,
			mean_interval_ms: Math.round(mean),
			min_interval_ms: min,
			max_interval_ms: max,
			game_duration_ms: this.clickData.length > 0 ? this.clickData[this.clickData.length - 1].Relative_Time_ms : 0
		};
	},

	// 转换为 CSV 格式
	toCSV: function() {
		if (this.clickData.length === 0) {
			return "No data recorded";
		}

		// 获取 Trial ID
		var trialID = $('#eeg_trial_id').attr('data-trial') || '0';

		// CSV 表头 - 新增 Trial_ID 列
		var csv = "Trial_ID,Click_Number,Relative_Time_ms,X_Coordinate,Y_Coordinate,Target_Info,Click_Interval_ms\n";

		// 添加每一行数据
		for (var i = 0; i < this.clickData.length; i++) {
			var row = this.clickData[i];
			csv += trialID + "," +  // 添加 Trial ID
				   row.Click_Number + "," +
				   row.Relative_Time_ms + "," +
				   row.X_Coordinate + "," +
				   row.Y_Coordinate + "," +
				   row.Target_Info + "," +
				   row.Click_Interval_ms + "\n";
		}

		return csv;
	},

	// 下载 CSV 文件
	downloadCSV: function() {
		var csv = this.toCSV();
		var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		var link = document.createElement("a");

		// 生成文件名（包含时间戳和难度）
		var date = new Date();
		var timestamp = date.getFullYear() +
						("0" + (date.getMonth() + 1)).slice(-2) +
						("0" + date.getDate()).slice(-2) + "_" +
						("0" + date.getHours()).slice(-2) +
						("0" + date.getMinutes()).slice(-2) +
						("0" + date.getSeconds()).slice(-2);
		var filename = "Game_Report_Level" + currentLevel + "_" + timestamp + ".csv";

		if (navigator.msSaveBlob) { // IE 10+
			navigator.msSaveBlob(blob, filename);
		} else {
			link.href = URL.createObjectURL(blob);
			link.download = filename;
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}

		console.log("GameTracker: CSV 文件已下载 - " + filename);

		// 同时在控制台输出统计报告
		var report = this.generateReport();
		console.log("=== 游戏统计报告 ===");
		console.log("总点击次数: " + report.total_clicks);
		console.log("平均点击间隔: " + report.mean_interval_ms + "ms");
		console.log("最小点击间隔: " + report.min_interval_ms + "ms");
		console.log("最大点击间隔: " + report.max_interval_ms + "ms");
		console.log("游戏总时长: " + report.game_duration_ms + "ms");
	},

	// 重置数据
	reset: function() {
		this.isTracking = false;
		this.startTime = 0;
		this.clickData = [];
		this.clickCounter = 0;
	}
};
// ==================== 游戏数据记录模块结束 ====================

// 暴露给外部的 Trial ID 设置方法
window.setTrialID = function(trialID) {
	$('#eeg_trial_id').attr('data-trial', trialID);
	console.log("Trial ID 已设置为: " + trialID);
};

$(function() {
	// 处理屏幕适配
	function autoRootFontSize() {
		document.documentElement.style.fontSize = Math.min(screen.width, document.documentElement.getBoundingClientRect().width) /
			750 * 32 + 'px';
		// 取screen.width和document.documentElement.getBoundingClientRect().width的最小值；除以750，乘以32；懂的起撒，就是原本是750大小的32px;如果屏幕大小变成了375px,那么字体就是16px;也就是根字体fontSize大小和屏幕大小成正比变化！是不是很简单
		// console.log(document.documentElement.style.fontSize)
	}
	window.addEventListener('resize', autoRootFontSize);
	autoRootFontSize();

	// 移动端初始化检查
	console.log("设备信息:", {
		userAgent: navigator.userAgent,
		isMobile: /Mobile|Android|iPhone|iPad/i.test(navigator.userAgent),
		screenWidth: window.innerWidth,
		screenHeight: window.innerHeight
	});

})




// 给游戏限制一个运行的时间
var gameTime = "60";
var s = 0;
// 随机函数

function rand(min, max) {
	return Math.round(Math.random() * (max - min) + min);
}
// var secs = rand(800, 1000);
var secs = rand(500, 800);
var stay = rand(150, 250);
// var stay = rand(1500, 2050);

// 彻底清理所有定时器
function clearAllTimers() {
	if (gameTiming) {
		clearInterval(gameTiming);
		gameTiming = null;
	}
	if (gameCircle) {
		clearInterval(gameCircle);
		gameCircle = null;
	}
	gameEndTime = null;
}

// 时间倒计时函数 - 基于时间戳的可靠倒计时
function timer(seconds) {
	// 记录游戏结束的绝对时间戳
	gameEndTime = Date.now() + (seconds * 1000);

	gameTiming = setInterval(function() {
		// 计算剩余毫秒数
		var remaining = gameEndTime - Date.now();

		// 转换为秒数（向上取整，确保显示到 00）
		var remainingSeconds = Math.ceil(remaining / 1000);

		// 显示剩余时间（最小显示 00）
		var displaySeconds = Math.max(0, remainingSeconds);
		if (displaySeconds <= 9) {
			displaySeconds = '0' + displaySeconds;
		}
		$(".timeNum").text(displaySeconds);

		// 时间到了才结束（<= 0 确保跑满完整秒数）
		if (remaining <= 0) {
			clearAllTimers();
			// 游戏结束，移除点击特效事件
			disableClickRipple();

			// *** 停止数据记录并导出 CSV ***
			GameTracker.stop();
			GameTracker.downloadCSV();

			console.log("游戏时间到，结束");

			// 延时展示结束界面
			setTimeout(function() {
				$(".gameOverBox").show();
				$('#settlementNum').text($(".scoreNum").text());
				$(".scoreBox").toggle();
				$(".listBOx").toggle();
				$(".lolgBox").toggle();
			}, 500);
		}
	}, 100);  // 使用 100ms 更新一次，更精确
}

// 开始游戏
$(".start").on("click", function() {
	// 第一步：彻底清理旧的定时器
	clearAllTimers();

	// 第二步：根据当前难度更新参数
	var config = LEVEL_CONFIG[currentLevel];
	gameTime = config.gameTime;
	secs = rand(config.secsMin, config.secsMax);
	stay = rand(config.stayMin, config.stayMax);

	// *** 启动数据记录 ***
	GameTracker.reset();
	GameTracker.init();

	// 按钮移除开始框
	$(".startBox").hide();

	// 启用点击反馈特效
	enableClickRipple();

	// 获取游戏执行倒计时
	timer(gameTime);
	star(); // 第一次游戏的函数
});

// 重新开始函数
$(".restart").on("click", function() {
	// 第一步：彻底清理旧的定时器
	clearAllTimers();

	// 第二步：根据当前难度更新参数
	var config = LEVEL_CONFIG[currentLevel];
	gameTime = config.gameTime;
	secs = rand(config.secsMin, config.secsMax);
	stay = rand(config.stayMin, config.stayMax);

	// *** 重启数据记录 ***
	GameTracker.reset();
	GameTracker.init();

	// 防止多次点击
	console.log("执行重新开始玩");
		$(".gameOverBox").hide();
		$(".scoreNum").text("0");
		$(".timeNum").text(gameTime);
		$(".scoreBox").toggle();
		$(".listBOx").toggle();
		$(".lolgBox").toggle();

		// 重新启用点击反馈特效
		enableClickRipple();

		timer(gameTime);
		star();
})

// 难度选择事件
$(".difficulty-btn").on("click", function() {
	$(".difficulty-btn").removeClass("active");
	$(this).addClass("active");
	currentLevel = parseInt($(this).data("level"));
});

// 点击反馈特效功能
var rippleHandler = null; // 存储PC端点击事件处理函数引用
var rippleTouchHandler = null; // 存储移动端触摸事件处理函数引用

function createRipple(x, y, targetInfo) {
	// *** 记录点击数据 ***
	GameTracker.recordClick(x, y, targetInfo);

	var ripple = document.createElement('div');
	ripple.className = 'click-ripple';
	ripple.style.left = x + 'px';
	ripple.style.top = y + 'px';

	$('.GameBoxBg').append(ripple);

	// 动画结束后移除元素，防止内存泄漏
	ripple.addEventListener('animationend', function() {
		ripple.remove();
	});
}

function enableClickRipple() {
	// 先移除旧的事件监听，防止重复绑定
	disableClickRipple();

	// PC 端点击事件
	rippleHandler = function(e) {
		// 使用 offsetX/offsetY 获取相对于 .GameBoxBg 的坐标
		var x = e.offsetX;
		var y = e.offsetY;

		// 如果点击的是子元素，需要计算相对于 GameBoxBg 的坐标
		if (e.target !== this) {
			var rect = this.getBoundingClientRect();
			x = e.clientX - rect.left;
			y = e.clientY - rect.top;
		}

		// 获取目标信息（判断点击的是什么元素）
		var targetInfo = 'background';
		if (e.target.tagName === 'IMG') {
			// 点击的是图片（狼）
			var imgSrc = e.target.src || '';
			if (imgSrc.indexOf('/h') > -1) {
				targetInfo = 'wolf_big';  // 大灰狼
			} else if (imgSrc.indexOf('/x') > -1) {
				targetInfo = 'wolf_small';  // 小灰灰
			} else {
				targetInfo = 'wolf_unknown';
			}
		}

		createRipple(x, y, targetInfo);
	};

	$('.GameBoxBg')[0].addEventListener('click', rippleHandler);

	// 移动端触摸事件 - 使用具名函数，方便移除
	rippleTouchHandler = function(e) {
		var touch = e.touches[0];
		var rect = this.getBoundingClientRect();
		var x = touch.clientX - rect.left;
		var y = touch.clientY - rect.top;

		// 获取目标信息
		var targetInfo = 'background';
		if (e.target.tagName === 'IMG') {
			var imgSrc = e.target.src || '';
			if (imgSrc.indexOf('/h') > -1) {
				targetInfo = 'wolf_big';
			} else if (imgSrc.indexOf('/x') > -1) {
				targetInfo = 'wolf_small';
			} else {
				targetInfo = 'wolf_unknown';
			}
		}

		createRipple(x, y, targetInfo);
	};

	$('.GameBoxBg')[0].addEventListener('touchstart', rippleTouchHandler);
}

function disableClickRipple() {
	if (rippleHandler) {
		$('.GameBoxBg')[0].removeEventListener('click', rippleHandler);
		rippleHandler = null;
	}
	if (rippleTouchHandler) {
		$('.GameBoxBg')[0].removeEventListener('touchstart', rippleTouchHandler);
		rippleTouchHandler = null;
	}
}




// 游戏开始函数
function star() {
	var Htc = 0;
	var Xtc = 0;
	//=============================================================================游戏进行时
	gameCircle = setInterval(function() {
		//灰太狼随机出现的位置
		var arrPos = [{
				left: "2.25rem",
				top: "10.9375rem"
			},
			{
				left: "9.0625rem",
				top: "9.4375rem"
			},
			{
				left: "15.125rem",
				top: "11.625rem"
			},
			{
				left: "2.25rem",
				top: "17.75rem"
			},
			{
				left: "9.1875rem",
				top: "16.3125rem"
			},
			{
				left: "15.125rem",
				top: "18.5rem"
			},
			{
				left: "2.125rem",
				top: "27rem"
			},
			{
				left: "8.875rem",
				top: "25.4375rem"
			},
			{
				left: "15.125rem",
				top: "27.625rem"
			}
		];
		// 将图片存进数组
		// 灰太狼，
		var wolf_1 = ['image/h0.png', 'image/h1.png', 'image/h2.png', 'image/h3.png', 'image/h4.png', 'image/h5.png',
			'image/h6.png',
			'image/h7.png', 'image/h8.png', 'image/h9.png'
		];
		// 创建一个img标签
		var newImg = document.createElement('img');
		// container盒子内添加img标签
		$(".GameBoxBg").append(newImg);
		// //  一共9个位置，狼的随机一个位置出现
		var wfLocation = rand(0, 8);
		// // 给新建的img标签添加左边距
		newImg.style.width = "6.75rem";
		// 防止js加载时，Img出现占位白边，此处属性设置Auto自适应
		newImg.style.height = "auto";
		newImg.style.left = arrPos[wfLocation].left;
		// 给新建的img标签添加顶部边距
		newImg.style.top = arrPos[wfLocation].top;

		// 给新建的img标签属性，设置为根据自己的位置定位
		newImg.style.position = 'absolute';
		// 选择灰太狼还是小灰灰
		var X = rand(0, 1);
		// console.log(X)
		// 当X<1的时候，选择正确
		if (X == 1) {

			Htc++;
			// 等于1时为正确
			X = 'h';
		} else {

			Xtc++;
			// 否则错误
			X = 'x';
		}
		var y = 0;
		// 图片设置为可见
		newImg.style.display = 'block';
		var appear0 = setInterval(function() {
			newImg.src = 'image/' + X + y + '.png';
			// 当前程序没执行一次，加一
			y++;
			// 设置鼠标单击次数判断条件
			var indexs = 0;
			// 当img被点击执行函数
			newImg.onclick = function() {
				// 鼠标被点击条件加一
				indexs++;
				if (indexs > 1) {
					// 鼠标只能点击1次 而不能无限点
					return false;
				}
				// y等于第五帧动画图片
				y = 5;
				// 执行图片被点击的动画
				for (var i = 0; i < 4; i++) {
					y++;
					// 每执行一次赋值给当前被点击的标签做动效
					newImg.src = wolf_1[y];

					if (y > 9) {
						y--;
					}
				};
				// 当点击图片是正确
				if (X == 'h') {
					// 添加分数
					s += 10;
					// 将当前的数值赋值到HTML分数中显示
					$(".scoreNum").text(s);
				} else if (X == 'x') {
					// 反之单错了执行
					s -= 10;
					if (s <= 0) {
						s = 0;
					}
					// 将当前错误的数值，赋值到HTML分数中显示
					$(".scoreNum").text(s);
				}
			};

			if (y > 5) {
				clearInterval(appear0);
				setTimeout(function() {
					y = 5;
					var appear1 = setInterval(function() {
						newImg.src = 'image/' + X + y + '.png';
						// console.log(y);
						y--;
						if (y < 0) {
							clearInterval(appear1);
							newImg.style.display = 'none';
							newImg.remove();
						}
					}, 50)
				}, stay)
			}
		}, 50);
		// 
		// console.log("总弹出：" + (Htc + Xtc) + "次,大灰狼弹出" + Htc + "次,小灰狼弹出" + Xtc + "次")
	}, secs)
	s = 0;
	$(".scoreNum").text(s);
	//=============================================================================游戏结束
}






