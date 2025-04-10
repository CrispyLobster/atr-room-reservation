const app = getApp()

// 生成未来七天的日期
function getNextSevenDays() {
	const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
	const dateList = []

	for (let i = 0; i < 7; i++) {
		const date = new Date()
		date.setDate(date.getDate() + i)

		const year = date.getFullYear()
		const month = date.getMonth() + 1
		const day = date.getDate()
		const weekDay = days[date.getDay()]

		const dateObj = {
			date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
			dateText: `${month}/${day}`,
			day: weekDay,
		}

		dateList.push(dateObj)
	}

	return dateList
}

// 生成时间段列表
function generateTimeSlots(date) {
	// 从早上8点到晚上9点，每小时一个时间段
	const timeSlots = []
	for (let hour = 8; hour < 21; hour++) {
		timeSlots.push({
			id: hour - 7, // ID从1开始
			startTime: `${hour.toString().padStart(2, '0')}:00`,
			endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
			isBooked: false,
		})
	}

	// 检查是否为当天日期
	const now = new Date()
	const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
		.getDate()
		.toString()
		.padStart(2, '0')}`
	const isToday = date === today

	// 当前小时和分钟
	const currentHour = now.getHours()
	const currentMinute = now.getMinutes()

	// 从全局获取预约数据
	const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []

	// 遍历时间段进行处理
	timeSlots.forEach(slot => {
		// 解析开始时间
		const [startHour, startMinute] = slot.startTime.split(':').map(Number)

		// 条件1：如果是当天且时间已过或者距离不足1小时，标记为不可预约
		if (isToday) {
			// 计算距离开始时间的小时差
			const hourDiff = startHour - currentHour
			const minuteDiff = startMinute - currentMinute
			const totalMinuteDiff = hourDiff * 60 + minuteDiff

			if (totalMinuteDiff < 60) {
				// 不足1小时
				slot.isBooked = true
				slot.isPast = true // 标记为过期
			}
		}

		// 条件2：检查是否已被预约
		appointments.forEach(appointment => {
			// 只处理当前显示日期的预约，且状态不是已取消的
			if (
				appointment.date === date &&
				appointment.timeId === slot.id &&
				appointment.status !== 'canceled'
			) {
				slot.isBooked = true
			}
		})
	})

	return timeSlots
}

// 检查用户预约次数
function checkUserAppointmentCount() {
	const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []
	const userAppointments = appointments.filter(appointment => appointment.status !== 'canceled')
	return userAppointments.length
}

Page({
	data: {
		dateList: [],
		selectedDate: '',
		timeSlots: [],
		appointmentCount: 0,
	},

	onLoad: function (options) {
		const dateList = getNextSevenDays()
		this.setData({
			dateList,
			selectedDate: dateList[0].date,
		})

		this.loadTimeSlots(dateList[0].date)
	},

	onShow: function () {
		// 每次显示页面时刷新时间段数据
		if (this.data.selectedDate) {
			this.loadTimeSlots(this.data.selectedDate)
		}

		// 更新用户预约次数
		const appointmentCount = checkUserAppointmentCount()
		this.setData({
			appointmentCount,
		})
	},

	// 下拉刷新
	onPullDownRefresh: function () {
		this.loadTimeSlots(this.data.selectedDate)

		// 更新用户预约次数
		const appointmentCount = checkUserAppointmentCount()
		this.setData({
			appointmentCount,
		})

		wx.stopPullDownRefresh()
	},

	// 切换选择的日期
	switchDate: function (e) {
		const date = e.currentTarget.dataset.date
		this.setData({
			selectedDate: date,
		})

		this.loadTimeSlots(date)
	},

	// 加载时间段列表
	loadTimeSlots: function (date) {
		console.log('加载时间段数据，日期:', date)

		// 获取时间段数据
		const timeSlots = generateTimeSlots(date)

		this.setData({
			timeSlots,
		})
	},

	// 跳转到预约表单页
	goToReservation: function (e) {
		const timeId = e.currentTarget.dataset.timeId
		const selectedSlot = this.data.timeSlots.find(item => item.id === timeId)

		if (selectedSlot && !selectedSlot.isBooked) {
			try {
				wx.navigateTo({
					url: `/pages/reservation/reservation?date=${this.data.selectedDate}&timeId=${timeId}&startTime=${selectedSlot.startTime}&endTime=${selectedSlot.endTime}`,
					complete: res => {
						// 处理页面跳转完成事件，无论成功还是失败
						if (res.errMsg !== 'navigateTo:ok') {
							console.error('页面跳转错误:', res.errMsg)
							wx.showToast({
								title: '页面跳转失败，请重试',
								icon: 'none',
							})
						}
					},
				})
			} catch (error) {
				console.error('导航错误:', error)
				wx.showToast({
					title: '系统错误，请重试',
					icon: 'none',
				})
			}
		} else {
			wx.showToast({
				title: '该时间段已被预约',
				icon: 'none',
			})
		}
	},
})
