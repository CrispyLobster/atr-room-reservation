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

	// 从数据库加载用户信息
	loadUserInfo: function () {
		if (app.globalData.userInfo) {
			this.setData({
				'formData.name': app.globalData.userInfo.realName || '',
				'formData.phone': app.globalData.userInfo.phone || '',
				'formData.studentId': app.globalData.userInfo.studentId || '',
			})
		} else {
			// 如果全局没有用户信息，从数据库获取
			wx.cloud.callFunction({
				name: 'login',
				success: res => {
					const openid = res.result.openid
					const db = wx.cloud.database()

					db.collection('users')
						.doc(openid)
						.get()
						.then(res => {
							app.globalData.userInfo = res.data
							app.globalData.hasLogin = true

							this.setData({
								'formData.name': res.data.realName || '',
								'formData.phone': res.data.phone || '',
								'formData.studentId': res.data.studentId || '',
							})
						})
				},
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
		this.checkIfBooked().then(isBooked => {
			if (isBooked) {
				this.showError('该时间段已被预约，请选择其他时间')
				return
			}

			// 获取用户ID
			wx.cloud.callFunction({
				name: 'login',
				success: res => {
					const openid = res.result.openid
					const db = wx.cloud.database()

					// 构建预约数据
					const appointmentData = {
						userId: openid,
						roomName: '面试室', // 默认房间名称
						date: this.data.date,
						timeId: parseInt(this.data.timeId),
						startTime: this.data.startTime,
						endTime: this.data.endTime,
						name: name,
						studentId: studentId,
						phone: phone,
						purpose: purpose || '未填写',
						status: 'pending', // 预约状态：pending-未开始，completed-已完成，canceled-已取消
						createdAt: db.serverDate(),
					}

					// 添加到数据库
					db.collection('room_reservation')
						.add({
							data: appointmentData,
						})
						.then(res => {
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
						})
						.catch(err => {
							console.error('添加预约失败', err)
							this.showError('预约失败，请重试')
						})
				},
				fail: err => {
					console.error('获取用户ID失败', err)
					this.showError('网络错误，请重试')
				},
			})
		})
	},

	// 检查时间段是否已被预约
	checkIfBooked: function () {
		return new Promise((resolve, reject) => {
			const db = wx.cloud.database()

			db.collection('room_reservation')
				.where({
					date: this.data.date,
					timeId: parseInt(this.data.timeId),
					status: 'pending',
				})
				.count()
				.then(res => {
					resolve(res.total > 0)
				})
				.catch(err => {
					console.error('查询预约状态失败', err)
					// 出错时默认为未被预约，让用户可以继续
					resolve(false)
				})
		})
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
