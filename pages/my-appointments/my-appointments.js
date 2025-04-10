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
						this.setData({
							appointments: res.data || [],
						})
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
})
