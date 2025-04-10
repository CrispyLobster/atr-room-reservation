const app = getApp()

Page({
	data: {
		userInfo: {
			realName: '',
			studentId: '',
			phone: '',
		},
	},

	onLoad: function (options) {
		// 尝试获取已有的用户信息
		if (app.globalData.userInfo) {
			this.setData({
				userInfo: {
					realName: app.globalData.userInfo.realName || '',
					studentId: app.globalData.userInfo.studentId || '',
					phone: app.globalData.userInfo.phone || '',
				},
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
								userInfo: {
									realName: res.data.realName || '',
									studentId: res.data.studentId || '',
									phone: res.data.phone || '',
								},
							})
						})
				},
			})
		}
	},

	// 提交用户信息
	submitUserInfo: function (e) {
		const { realName, studentId, phone } = e.detail.value

		// 表单验证
		if (!realName.trim()) {
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

		// 获取数据库和当前用户ID
		const db = wx.cloud.database()

		wx.cloud.callFunction({
			name: 'login',
			success: res => {
				const openid = res.result.openid

				// 更新用户信息到数据库
				db.collection('users')
					.doc(openid)
					.update({
						data: {
							realName: realName,
							studentId: studentId,
							phone: phone,
							updatedAt: db.serverDate(),
						},
					})
					.then(res => {
						console.log('更新用户信息成功', res)

						// 更新全局用户信息
						if (app.globalData.userInfo) {
							app.globalData.userInfo.realName = realName
							app.globalData.userInfo.studentId = studentId
							app.globalData.userInfo.phone = phone
						}

						// 显示成功提示
						wx.showToast({
							title: '保存成功',
							icon: 'success',
							duration: 2000,
						})

						// 返回首页
						setTimeout(() => {
							wx.switchTab({
								url: '/pages/index/index',
							})
						}, 1500)
					})
					.catch(err => {
						console.error('更新用户信息失败', err)
						this.showError('保存失败，请重试')
					})
			},
			fail: err => {
				console.error('获取用户openid失败', err)
				this.showError('网络错误，请重试')
			},
		})
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
