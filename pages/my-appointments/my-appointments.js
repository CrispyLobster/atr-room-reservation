const app = getApp()

Page({
	data: {
		appointments: [],
		statusText: {
			pending: '未开始',
			completed: '已完成',
			canceled: '已取消',
		},
	},

	onLoad: function (options) {
		// 加载预约数据
		this.loadAppointments()
	},

	onShow: function () {
		// 每次显示页面时刷新预约数据
		this.loadAppointments()
	},

	// 加载预约列表
	loadAppointments: function () {
		wx.showLoading({
			title: '加载中',
		})

		// 从云数据库获取预约数据
		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				const openid = res.result.openid
				const db = wx.cloud.database()

				// 查询当前用户的所有预约
				db.collection('room_reservation')
					.where({
						userId: openid,
					})
					.orderBy('date', 'desc') // 按日期降序排序
					.orderBy('startTime', 'desc') // 同一天按开始时间降序排序
					.get()
					.then(res => {
						wx.hideLoading()

						// 检查未完成预约的状态，根据当前时间自动更新状态
						const appointments = res.data || []
						const currentDate = new Date()
						const currentDateStr = this.formatDate(currentDate)
						const currentTimeStr = this.formatTime(currentDate)
						let hasUpdates = false

						// 检查每个预约项，更新已过期但仍为pending的状态
						const updatedAppointments = appointments.map(appointment => {
							// 只检查状态为pending的预约
							if (appointment.status === 'pending') {
								// 如果日期已过，或者日期相同但时间已过
								if (
									appointment.date < currentDateStr ||
									(appointment.date === currentDateStr && appointment.endTime <= currentTimeStr)
								) {
									// 标记预约为已完成
									appointment.status = 'completed'
									hasUpdates = true

									// 更新数据库记录
									this.updateAppointmentStatus(appointment._id, 'completed')
								}
							}
							return appointment
						})

						// 更新页面数据
						this.setData({
							appointments: updatedAppointments,
						})

						console.log('预约状态检查完成，是否有更新：', hasUpdates)
					})
					.catch(err => {
						wx.hideLoading()
						console.error('获取预约列表失败', err)
						wx.showToast({
							title: '加载失败',
							icon: 'none',
						})
					})
			},
			fail: err => {
				wx.hideLoading()
				console.error('调用云函数失败', err)
			},
		})
	},

	// 跳转到预约详情
	goToDetail: function (e) {
		const id = e.currentTarget.dataset.id
		wx.navigateTo({
			url: `/pages/detail/detail?id=${id}`,
		})
	},

	// 跳转到预约页
	goToIndex: function () {
		wx.switchTab({
			url: '/pages/index/index',
		})
	},

	// 取消预约
	cancelAppointment: function (e) {
		const id = e.currentTarget.dataset.id

		wx.showModal({
			title: '提示',
			content: '确定要取消这个预约吗？',
			success: res => {
				if (res.confirm) {
					this.doCancelAppointment(id)
				}
			},
		})
	},

	// 执行取消预约
	doCancelAppointment: function (id) {
		wx.showLoading({
			title: '处理中',
		})

		const db = wx.cloud.database()

		// 检查ID是否存在
		if (!id) {
			wx.hideLoading()
			wx.showToast({
				title: '参数错误',
				icon: 'none',
			})
			return
		}

		console.log('取消预约ID:', id)

		// 更新预约状态为已取消
		db.collection('room_reservation')
			.doc(id)
			.update({
				data: {
					status: 'canceled',
					updatedAt: db.serverDate(),
				},
			})
			.then(res => {
				wx.hideLoading()
				wx.showToast({
					title: '预约已取消',
					icon: 'success',
				})

				// 刷新列表
				this.loadAppointments()
			})
			.catch(err => {
				wx.hideLoading()
				console.error('取消预约失败', err)
				wx.showToast({
					title: '操作失败',
					icon: 'none',
				})
			})
	},

	// 更新预约状态到数据库
	updateAppointmentStatus: function (id, status) {
		const db = wx.cloud.database()

		db.collection('room_reservation')
			.doc(id)
			.update({
				data: {
					status: status,
					updatedAt: db.serverDate(),
				},
			})
			.then(() => {
				console.log(`预约 ${id} 状态已更新为 ${status}`)
			})
			.catch(err => {
				console.error(`更新预约 ${id} 状态失败:`, err)
			})
	},

	// 格式化日期为 yyyy-MM-dd
	formatDate: function (date) {
		const year = date.getFullYear()
		const month = (date.getMonth() + 1).toString().padStart(2, '0')
		const day = date.getDate().toString().padStart(2, '0')
		return `${year}-${month}-${day}`
	},

	// 格式化时间为 HH:mm
	formatTime: function (date) {
		const hours = date.getHours().toString().padStart(2, '0')
		const minutes = date.getMinutes().toString().padStart(2, '0')
		return `${hours}:${minutes}`
	},
})
