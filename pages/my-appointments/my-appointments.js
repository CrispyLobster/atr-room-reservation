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
		// 获取预约数据（实际应用中应该从服务器获取）
		const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []

		// 按日期和时间倒序排序，最新的在前面
		appointments.sort((a, b) => {
			// 先按日期比较
			if (a.date !== b.date) {
				return a.date < b.date ? 1 : -1
			}
			// 日期相同按开始时间比较
			return a.startTime < b.startTime ? 1 : -1
		})

		this.setData({
			appointments,
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
		// 获取所有预约
		let appointments = app.globalData.appointments || []

		// 找到要取消的预约
		const index = appointments.findIndex(item => item.id == id)

		if (index !== -1) {
			// 更新状态为已取消
			appointments[index].status = 'canceled'
			app.globalData.appointments = appointments

			// 保存到本地存储
			wx.setStorageSync('appointments', appointments)

			// 刷新列表
			this.loadAppointments()

			// 显示取消成功提示
			wx.showToast({
				title: '预约已取消',
				icon: 'success',
			})
		}
	},
})
