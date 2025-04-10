const app = getApp()

Page({
	data: {
		userInfo: {
			name: '',
			studentId: '',
			phone: '',
		},
	},

	onLoad: function (options) {
		// 尝试获取已有的用户信息
		const userInfo = app.globalData.userInfo || {}
		const userProfile = wx.getStorageSync('userProfile') || {}

		this.setData({
			userInfo: {
				name: userProfile.name || '',
				studentId: userProfile.studentId || '',
				phone: userProfile.phone || '',
			},
		})
	},

	// 提交用户信息
	submitUserInfo: function (e) {
		const { name, studentId, phone } = e.detail.value

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

		// 构建用户资料
		const userProfile = {
			name,
			studentId,
			phone,
			updatedAt: new Date().toISOString(),
		}

		// 合并到全局用户信息
		if (app.globalData.userInfo) {
			app.globalData.userInfo = {
				...app.globalData.userInfo,
				...userProfile,
				nickName: name,
			}
		} else {
			app.globalData.userInfo = {
				nickName: name,
				...userProfile,
			}
		}

		// 保存到本地存储
		wx.setStorageSync('userProfile', userProfile)
		wx.setStorageSync('userInfo', app.globalData.userInfo)

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
