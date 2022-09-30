import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import './utils/extensions'
dayjs.extend(utc)
dayjs.extend(relativeTime)
