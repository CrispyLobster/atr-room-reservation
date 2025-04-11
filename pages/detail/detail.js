const app = getApp()

Page({
	data: {
		id: '',
		appointment: null,
		formatCreateTime: '',
		statusText: {
			pending: '未开始',
			completed: '已完成',
			canceled: '已取消',
		},
	},

	onLoad: function (options) {
		if (options.id) {
			this.setData({
				id: options.id,
			})

			this.loadAppointment(options.id)
		} else {
			wx.showToast({
				title: '参数错误',
				icon: 'none',
			})
			setTimeout(() => {
				wx.navigateBack()
			}, 1500)
		}
	},

	// 加载预约详情
	loadAppointment: function (id) {
		wx.showLoading({
			title: '加载中',
		})

		const db = wx.cloud.database()

		// 从数据库获取预约信息
		db.collection('room_reservation')
			.doc(id)
			.get()
			.then(res => {
				wx.hideLoading()

				if (res.data) {
					// 格式化创建时间
					let formatCreateTime = '未知'
					if (res.data.createdAt) {
						const createTime = new Date(res.data.createdAt)
						formatCreateTime = `${createTime.getFullYear()}-${this.formatNumber(
							createTime.getMonth() + 1,
						)}-${this.formatNumber(createTime.getDate())} ${this.formatNumber(
							createTime.getHours(),
						)}:${this.formatNumber(createTime.getMinutes())}`
					}

					// 检查预约状态，如果已经过期但状态还是pending，则更新为completed
					const appointment = res.data
					if (appointment.status === 'pending') {
						const currentDate = new Date()
						const currentDateStr = this.formatDate(currentDate)
						const currentTimeStr = this.formatTime(currentDate)

						// 检查日期和时间是否已过
						if (
							appointment.date < currentDateStr ||
							(appointment.date === currentDateStr && appointment.endTime <= currentTimeStr)
						) {
							// 更新为已完成状态
							appointment.status = 'completed'

							// 同步更新数据库
							this.updateAppointmentStatus(appointment._id, 'completed')

							console.log('预约已过期，状态已更新为已完成')
						}
					}

					this.setData({
						appointment: appointment,
						formatCreateTime,
					})
				} else {
					wx.showToast({
						title: '未找到预约信息',
						icon: 'none',
					})
					setTimeout(() => {
						wx.navigateBack()
					}, 1500)
				}
			})
			.catch(err => {
				wx.hideLoading()
				console.error('获取预约详情失败', err)
				wx.showToast({
					title: '加载失败',
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

	// 格式化数字
	formatNumber: function (n) {
		n = n.toString()
		return n[1] ? n : '0' + n
	},

	// 取消预约
	cancelAppointment: function () {
		wx.showModal({
			title: '提示',
			content: '确定要取消这个预约吗？',
			success: res => {
				if (res.confirm) {
					this.doCancelAppointment()
				}
			},
		})
	},

	// 执行取消预约
	doCancelAppointment: function () {
		if (!this.data.id) return

		wx.showLoading({
			title: '处理中',
		})

		const db = wx.cloud.database()
		console.log('取消预约ID:', this.data.id)

		// 更新预约状态为已取消
		db.collection('room_reservation')
			.doc(this.data.id)
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

				// 刷新详情
				this.loadAppointment(this.data.id)
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

	// 返回上一页
	goBack: function () {
		try {
			wx.navigateBack({
				fail: () => {
					// 如果返回失败，则跳转到首页
					wx.switchTab({
						url: '/pages/index/index',
					})
				},
			})
		} catch (error) {
			console.error('导航错误:', error)
			// 出现异常时跳转到首页
			wx.switchTab({
				url: '/pages/index/index',
			})
		}
	},

	// 页面卸载时处理
	onUnload: function () {
		// 清除导航堆栈中可能存在的重复页面引用
		const pages = getCurrentPages()
		console.log('当前页面栈:', pages.length)
	},
})
