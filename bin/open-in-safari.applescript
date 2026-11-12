-- 在 Safari 里维护一个「DSH Web 专属窗口」：
--   * 记住上次自己开的窗口 id，还在就复用它，不碰用户自己的窗口
--   * 窗口被关掉了就新开一个，并记下新 id
-- 参数：1 = 目标 URL；2 = 保存窗口 id 的文件路径
on run argv
	set targetUrl to item 1 of argv
	set idFile to item 2 of argv

	set savedId to 0
	try
		set savedId to (do shell script "cat " & quoted form of idFile & " 2>/dev/null || echo 0") as integer
	end try

	set mode to "new"
	set newId to 0

	tell application "Safari"
		activate

		if savedId > 0 then
			try
				set w to window id savedId
				set currentUrl to URL of current tab of w
				if currentUrl is targetUrl then
					-- 已经在看同一个页面：只把窗口提到前面，不重新加载
					set index of w to 1
					set mode to "focused"
				else
					set URL of current tab of w to targetUrl
					set index of w to 1
					set mode to "reused"
				end if
			end try
		end if

		if mode is "new" then
			set preCount to count of windows
			make new document with properties {URL:targetUrl}
			set newId to id of window 1

			-- Safari 冷启动会额外弹一个起始页，只在这种情况下收掉它
			if preCount is 0 then
				delay 0.8
				repeat with w2 in windows
					try
						if (id of w2) is not newId then
							set u to URL of current tab of w2
							if u is "favorites://" or u is "about:blank" then close w2
						end if
					end try
				end repeat
			end if
		end if
	end tell

	if newId > 0 then
		try
			do shell script "printf '%s' " & newId & " > " & quoted form of idFile
		end try
	end if

	return mode
end run
