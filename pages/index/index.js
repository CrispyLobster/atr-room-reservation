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
function generateTimeSlots(date, bookedSlots) {
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
		if (bookedSlots && bookedSlots.length > 0) {
			bookedSlots.forEach(bookedSlot => {
				// 确保类型一致进行比较
				const slotId = parseInt(slot.id)
				const bookedId = parseInt(bookedSlot)

				if (slotId === bookedId) {
					console.log(`时间段 ${slot.startTime}-${slot.endTime} 已被预约`)
					slot.isBooked = true
				}
			})
		}
	})

	return timeSlots
}

Page({
	data: {
		dateList: [],
		selectedDate: '',
		timeSlots: [],
		appointmentCount: 0,
		bookedSlots: [],
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
		console.log('页面显示，刷新数据')
		// 每次显示页面时刷新时间段数据
		if (this.data.selectedDate) {
			// 强制刷新数据，确保同步
			this.loadTimeSlots(this.data.selectedDate)
		}

		// 更新用户预约次数
		this.loadAppointmentCount()
	},

	// 下拉刷新
	onPullDownRefresh: function () {
		console.log('下拉刷新，重新加载数据')
		// 强制刷新时间段数据
		this.loadTimeSlots(this.data.selectedDate)

		// 更新用户预约次数
		this.loadAppointmentCount()

		// 提示用户
		wx.showToast({
			title: '刷新成功',
			icon: 'success',
			duration: 1000,
		})

		wx.stopPullDownRefresh()
	},

	// 加载用户预约数量
	loadAppointmentCount: function () {
		console.log('加载当前登录用户的预约数量')

		// 获取当前用户的openid
		wx.cloud.callFunction({
			name: 'login',
			data: {},
			success: res => {
				console.log('获取用户openid成功:', res.result.openid)
				const openid = res.result.openid

				const db = wx.cloud.database()
				db.collection('room_reservation')
					.where({
						_openid: openid,
						status: 'pending',
					})
					.count()
					.then(res => {
						console.log('当前用户的预约数量:', res.total)
						this.setData({
							appointmentCount: res.total,
						})
					})
					.catch(err => {
						console.error('查询预约数量失败:', err)
					})
			},
			fail: err => {
				console.error('获取用户openid失败:', err)
				wx.showToast({
					title: '获取用户信息失败',
					icon: 'none',
				})
			},
		})
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
		wx.showLoading({
			title: '加载中',
		})

		// 使用云函数查询当天所有预约
		wx.cloud.callFunction({
			name: 'getAppointments',
			data: {
				date: date,
			},
			success: res => {
				console.log('云函数查询预约结果:', res.result)
				const appointments = res.result.data || []

				// 获取预约时间段ID和预约人姓名的映射
				const bookedTimeIds = appointments.map(item => item.timeId)
				console.log('已预约的时间段IDs:', bookedTimeIds)

				// 创建时间段ID到预约人姓名的映射
				const bookedInfoMap = {}
				appointments.forEach(item => {
					bookedInfoMap[item.timeId] = {
						name: item.name || '未知预约人',
						id: item._id,
					}
				})

				// 生成可用时间段
				const timeSlots = generateTimeSlots(date, bookedTimeIds)

				// 为已预约的时间段添加预约人信息
				timeSlots.forEach(slot => {
					if (slot.isBooked && bookedInfoMap[slot.id]) {
						slot.bookedBy = bookedInfoMap[slot.id].name
						slot.appointmentId = bookedInfoMap[slot.id].id
					}
				})

				this.setData({
					timeSlots: timeSlots,
					selectedTimeSlotId: null,
				})

				wx.hideLoading()
			},
			fail: err => {
				console.error('查询预约失败:', err)
				wx.hideLoading()
				wx.showToast({
					title: '加载预约信息失败',
					icon: 'none',
				})
			},
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
