// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
	env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
	const wxContext = cloud.getWXContext()

	// 接收查询参数
	const { date } = event

	if (!date) {
		return {
			code: -1,
			msg: '日期参数缺失',
			data: null,
		}
	}

	try {
		// 使用云函数权限查询所有预约记录
		const result = await db
			.collection('room_reservation')
			.where({
				date: date,
				status: 'pending', // 只查询未取消的预约
			})
			.get()

		console.log('查询预约结果:', result)

		return {
			code: 0,
			msg: '查询成功',
			data: result.data,
		}
	} catch (error) {
		console.error('查询预约失败:', error)
		return {
			code: -1,
			msg: '查询失败',
			error: error,
		}
	}
}
