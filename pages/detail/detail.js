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
		// 获取预约数据（实际应用中应该从服务器获取）
		const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []
		const appointment = appointments.find(item => item.id == id)

		if (appointment) {
			// 格式化创建时间
			const createTime = new Date(appointment.createTime)
			const formatCreateTime = `${createTime.getFullYear()}-${this.formatNumber(
				createTime.getMonth() + 1,
			)}-${this.formatNumber(createTime.getDate())} ${this.formatNumber(
				createTime.getHours(),
			)}:${this.formatNumber(createTime.getMinutes())}`

			this.setData({
				appointment,
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

		// 获取所有预约
		let appointments = app.globalData.appointments || []

		// 找到要取消的预约
		const index = appointments.findIndex(item => item.id == this.data.id)

		if (index !== -1) {
			// 更新状态为已取消
			appointments[index].status = 'canceled'
			app.globalData.appointments = appointments

			// 保存到本地存储
			wx.setStorageSync('appointments', appointments)

			// 刷新详情
			this.loadAppointment(this.data.id)

			// 显示取消成功提示
			wx.showToast({
				title: '预约已取消',
				icon: 'success',
			})
		}
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
