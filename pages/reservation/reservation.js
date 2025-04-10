const app = getApp()

Page({
	data: {
		date: '',
		timeId: '',
		startTime: '',
		endTime: '',
		formData: {
			name: '',
			studentId: '',
			phone: '',
			purpose: '',
		},
	},

	onLoad: function (options) {
		// 获取路由参数
		const { date, timeId, startTime, endTime } = options

		this.setData({
			date,
			timeId,
			startTime,
			endTime,
		})

		// 如果用户已登录，尝试自动填充信息
		this.loadUserInfo()
	},

	// 从本地存储和全局数据中加载用户信息
	loadUserInfo: function () {
		// 从app.globalData获取用户信息
		const userInfo = app.globalData.userInfo

		// 从本地存储获取用户配置信息
		const userProfile = wx.getStorageSync('userProfile')

		if (userInfo || userProfile) {
			this.setData({
				'formData.name': userProfile?.name || userInfo?.nickName || '',
				'formData.phone': userProfile?.phone || userInfo?.phone || '',
				'formData.studentId': userProfile?.studentId || userInfo?.studentId || '',
			})
		}
	},

	// 检查预约次数限制 - 已移除限制
	checkAppointmentLimit: function () {
		// 预约次数不再限制
		return true
	},

	// 提交预约表单
	submitReservation: function (e) {
		const { name, studentId, phone, purpose } = e.detail.value

		// 表单验证
		if (!name.trim()) {
			this.showError('请输入姓名')
			return
		}

		if (!studentId.trim()) {
			this.showError('请输入学号')
			return
		}

		if (!phone.trim()) {
			this.showError('请输入手机号码')
			return
		}

		if (!/^1\d{10}$/.test(phone)) {
			this.showError('手机号码格式不正确')
			return
		}

		// 检查时间段是否已被预约
		const isAlreadyBooked = this.checkIfBooked()
		if (isAlreadyBooked) {
			this.showError('该时间段已被预约，请选择其他时间')
			return
		}

		// 构建预约数据
		const appointment = {
			id: new Date().getTime(), // 使用时间戳作为临时ID
			date: this.data.date,
			timeId: parseInt(this.data.timeId),
			startTime: this.data.startTime,
			endTime: this.data.endTime,
			name,
			studentId,
			phone,
			purpose: purpose || '未填写',
			status: 'pending', // 预约状态：pending-未开始，completed-已完成，canceled-已取消
			createTime: new Date().toISOString(),
		}

		// 添加预约（在实际应用中应该调用后端接口）
		const allAppointments = app.globalData.appointments || []
		allAppointments.push(appointment)
		app.globalData.appointments = allAppointments

		// 保存到本地存储
		wx.setStorageSync('appointments', allAppointments)

		// 保存用户信息到本地，方便下次自动填充
		wx.setStorageSync('userProfile', {
			name,
			studentId,
			phone,
		})

		// 显示成功提示
		wx.showToast({
			title: '预约成功',
			icon: 'success',
			duration: 2000,
		})

		// 返回上一页
		setTimeout(() => {
			wx.navigateBack()
		}, 1500)
	},

	// 检查时间段是否已被预约
	checkIfBooked: function () {
		const appointments = app.globalData.appointments || wx.getStorageSync('appointments') || []
		const date = this.data.date
		const timeId = parseInt(this.data.timeId)

		return appointments.some(
			appointment =>
				appointment.date === date &&
				appointment.timeId === timeId &&
				appointment.status !== 'canceled',
		)
	},

	// 返回上一页
	goBack: function () {
		wx.navigateBack()
	},

	// 显示错误信息
	showError: function (message) {
		wx.showToast({
			title: message,
			icon: 'none',
			duration: 2000,
		})
	},
})
