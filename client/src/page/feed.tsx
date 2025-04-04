import { format } from "@astroimg/timeago";
import MarkdownPreview from '@uiw/react-markdown-preview';
import { useContext, useEffect, useRef, useState } from "react";
import { Helmet } from 'react-helmet';
import ReactModal from "react-modal";
import Popup from "reactjs-popup";
import tocbot from 'tocbot';
import { Link, useLocation } from "wouter";
import { Waiting } from "../components/loading";
import { client } from "../main";
import { ProfileContext } from "../state/profile";
import { headersWithAuth } from "../utils/auth";
import { siteName } from "../utils/constants";

type Feed = {
    id: number;
    title: string | null;
    content: string;
    uid: number;
    createdAt: Date;
    updatedAt: Date;
    hashtags: {
        id: number;
        name: string;
    }[];
    user: {
        avatar: string | null;
        id: number;
        username: string;
    };
}

export function FeedPage({ id }: { id: string }) {
    const profile = useContext(ProfileContext);
    const [feed, setFeed] = useState<Feed>()
    const [error, setError] = useState<string>()
    const [headImage, setHeadImage] = useState<string>()
    const ref = useRef("")
    const [_, setLocation] = useLocation()
    const [empty, setEmpty] = useState(true)
    function deleteFeed() {
        // 询问
        if (!confirm("确定要删除这篇文章吗？")) return
        if (!feed) return
        client.feed({ id: feed.id }).delete(null, {
            headers: headersWithAuth()
        }).then(({ error }: { error?: { value: string } }) => {
            if (error) {
                alert(error.value)
            } else {
                alert("删除成功")
                setLocation('/')
            }
        })
    }
    useEffect(() => {
        if (ref.current == id) return
        tocbot.init({
            tocSelector: '.toc',
            contentSelector: '.toc-content',
            headingSelector: 'h1, h2, h3, h4, h5, h6',
            collapseDepth: 2,
            scrollHandlerTimeout: 100,
            tocScrollingWrapper: null,
            scrollContainer: null,
            headingsOffset: 0,
            headingLabelCallback(headingLabel: string) {
                setEmpty(false)
                return headingLabel
            },
        })
        setFeed(undefined)
        setError(undefined)
        setHeadImage(undefined)
        client.feed({ id }).get({
            headers: headersWithAuth()
        }).then(({ data, error }: { data?: Feed, error?: { value: string } }) => {
            if (error) {
                setError(error.value as string)
            } else if (data && typeof data !== 'string') {
                setTimeout(() => {
                    setFeed(data)
                    // 提取首图
                    const img_reg = /!\[.*?\]\((.*?)\)/;
                    const img_match = img_reg.exec(data.content)
                    if (img_match) {
                        setHeadImage(img_match[1])
                    }
                    setTimeout(() => {
                        // 在渲染完成后刷新目录
                        tocbot.refresh()
                    }, 0)
                }, 0)
            }
        })
        ref.current = id
    }, [id])
    return (
        <Waiting for={feed || error}>
            {feed &&
                <Helmet>
                    <title>{`${feed.title ?? "Unnamed"} - ${process.env.NAME}`}</title>
                    <meta property="og:site_name" content={siteName} />
                    <meta property="og:title" content={feed.title ?? ""} />
                    <meta property="og:image" content={headImage ?? process.env.AVATAR} />
                    <meta property="og:type" content="article" />
                    <meta property="og:url" content={document.URL} />
                    <meta name="og:description" content={feed.content.length > 200 ? feed.content.substring(0, 200) : feed.content} />
                    <meta name="author" content={feed.user.username} />
                    <meta name="keywords" content={feed.hashtags.map(({ name }) => name).join(", ")} />
                    <meta name="description" content={feed.content.length > 200 ? feed.content.substring(0, 200) : feed.content} />
                </Helmet>
            }
            <div className="w-full flex flex-row justify-center ani-show">
                {error &&
                    <>
                        <div className="flex flex-col wauto rounded-2xl bg-w m-2 p-6 items-center justify-center">
                            <h1 className="text-xl font-bold t-primary">
                                {error}
                            </h1>
                            <button className="mt-2 bg-theme text-white px-4 py-2 rounded-full" onClick={() => window.location.href = '/'}>
                                返回首页
                            </button>
                        </div>
                    </>
                }
                {feed && !error &&
                    <>
                        <div className="xl:w-64" />
                        <main className="wauto">
                            <article className="rounded-2xl bg-w m-2 p-6" aria-label="正文">
                                <div className="flex flex-row items-center">
                                    <h1 className="text-2xl font-bold t-primary">
                                        {feed.title}
                                    </h1>
                                    <div className="flex-1 w-0" />
                                    {profile?.permission &&
                                        <Popup arrow={false} trigger={
                                            <button className="px-2 py bg-secondary rounded-full">
                                                <i className="ri-more-fill t-secondary"></i>
                                            </button>
                                        } position="bottom center">
                                            <div className="flex flex-col self-end t-secondary mt-2 space-y-2">
                                                <Link aria-label="编辑" href={`/writing/${feed.id}`} className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary rounded-full">
                                                    <i className="ri-edit-2-line" />
                                                </Link>
                                                <button aria-label="删除" onClick={deleteFeed} className="flex-1 flex flex-col items-end justify-center px-2 py bg-secondary rounded-full">
                                                    <i className="ri-delete-bin-7-line" />
                                                </button>
                                            </div>
                                        </Popup>}
                                </div>
                                <div className="my-2">
                                    <p className="text-gray-400 text-sm" title={new Date(feed.createdAt).toLocaleString()}>
                                        发布于 {format(feed.createdAt)}
                                    </p>
                                    {feed.createdAt !== feed.updatedAt &&
                                        <p className="text-gray-400 text-sm" title={new Date(feed.updatedAt).toLocaleString()}>
                                            更新于 {format(feed.updatedAt)}
                                        </p>
                                    }
                                </div>
                                <MarkdownPreview className="toc-content" source={feed.content} />
                                {feed.hashtags.length > 0 &&
                                    <div className="mt-2 flex flex-row space-x-2">
                                        {feed.hashtags.map(({ name }, index) => (
                                            <div key={index} className="bg-neutral-100 py-1 px-2 rounded-lg">
                                                {name}
                                            </div>
                                        ))}
                                    </div>
                                }
                                <div className="mt-2 flex flex-row items-center">
                                    <img src={feed.user.avatar || '/avatar.png'} className="w-8 h-8 rounded-full" />
                                    <div className="ml-2">
                                        <span className="text-gray-400 text-sm">
                                            {feed.user.username}
                                        </span>
                                    </div>
                                </div>
                            </article>
                            {feed && <Comments id={id} />}
                            <div className="h-16" />
                        </main>
                        <div className="w-80 hidden lg:block relative" >
                            <TOC empty={empty} />
                        </div>
                    </>
                }
            </div>
        </Waiting>
    )
}

export function TOCHeader() {
    const [isOpened, setIsOpened] = useState(false)
    const [empty, setEmpty] = useState(true)
    return (
        <div className="lg:hidden" >
            <button onClick={
                () => {
                    setIsOpened(true)
                    setTimeout(() => {
                        console.log("refresh")
                        tocbot.init({
                            tocSelector: '.toc2',
                            contentSelector: '.toc-content',
                            headingSelector: 'h1, h2, h3, h4, h5, h6',
                            collapseDepth: 2,
                            scrollHandlerTimeout: 100,
                            tocScrollingWrapper: null,
                            scrollContainer: null,
                            headingLabelCallback(headingLabel) {
                                setEmpty(false)
                                return headingLabel
                            },
                        })
                    }, 0)
                }
            } className="w-10 h-10 rounded-full flex flex-row items-center justify-center">
                <i className="ri-menu-2-fill t-primary ri-lg"></i>
            </button>
            <ReactModal isOpen={isOpened}
                style={{
                    content: {
                        top: '50%',
                        left: '50%',
                        right: 'auto',
                        bottom: 'auto',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)',
                        padding: '0',
                        border: 'none',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        background: 'white',
                    },
                    overlay: {
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 1000
                    }
                }}
                onRequestClose={() => {
                    setIsOpened(false)
                    setTimeout(() => {
                        tocbot.init({
                            tocSelector: '.toc',
                            contentSelector: '.toc-content',
                            headingSelector: 'h1, h2, h3, h4, h5, h6',
                            collapseDepth: 2,
                            scrollHandlerTimeout: 100,
                            tocScrollingWrapper: null,
                            scrollContainer: null,
                            headingLabelCallback(headingLabel) {
                                setEmpty(false)
                                return headingLabel
                            },
                        })
                    })
                }}
            >
                <div className="rounded-2xl bg-w py-4 px-4 fixed w-[80vw] sm:w-[60vw] lg:w-[40vw] overflow-clip relative t-primary" >
                    <h1 className="text-xl font-bold">
                        目录
                    </h1>
                    {empty && <p className="text-gray-400 text-sm mt-2">目录为空</p>}
                    <div className="toc toc2 mt-2" >
                    </div>
                </div >
            </ReactModal >
        </div >
    )
}

export function TOC({ empty }: { empty: boolean }) {
    return (
        <div className={`ml-2 rounded-2xl bg-w py-4 px-4 fixed start-0 end-0 top-[5.5rem] sticky t-primary`}>
            <h1 className="text-xl font-bold">
                目录
            </h1>
            {empty && <p className="text-gray-400 text-sm mt-2">目录为空</p>}
            <div className="toc mt-2">
            </div>
        </div>
    )
}

function CommentInput({ id, onRefresh }: { id: string, onRefresh: () => void }) {
    const [content, setContent] = useState("")
    const [error, setError] = useState("")
    function errorHumanize(error: string) {
        if (error === 'Unauthorized') return '请先登录'
        else if (error === 'Content is required') return '评论内容不能为空'
        return error
    }
    function submit() {
        client.feed.comment({ feed: id }).post(
            { content },
            {
                headers: headersWithAuth()
            }).then(({ error }: { error?: { value: string } }) => {
                if (error) {
                    setError(errorHumanize(error.value as string))
                } else {
                    setContent("")
                    setError("")
                    alert("评论成功")
                    onRefresh()
                }
            })
    }
    return (
        <div className="w-full rounded-2xl bg-w t-primary m-2 p-6 items-end flex flex-col">
            <div className="flex flex-col w-full items-start space-y-4">
                <label htmlFor="comment">评论</label>
                <textarea id="comment" placeholder="说点什么吧" className="bg-w w-full h-24 rounded-lg" value={content} onChange={e => setContent(e.target.value)} />
            </div>
            <button className="mt-2 bg-theme text-white px-4 py-2 rounded-full" onClick={submit}>
                发表评论
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    )
}




type Comment = {
    id: number;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
        id: number;
        username: string;
        avatar: string | null;
        permission: number | null;
    };
}

function Comments({ id }: { id: string }) {
    const [comments, setComments] = useState<Comment[]>([])
    const [error, setError] = useState<string>()
    const ref = useRef("")

    function loadComments() {
        client.feed.comment({ feed: id }).get({
            headers: headersWithAuth()
        }).then(({ data, error }: { data?: Comment[], error?: { value: string } }) => {
            if (error) {
                setError(error.value as string)
            } else if (data && Array.isArray(data)) {
                setComments(data)
            }
        })
    }
    useEffect(() => {
        if (ref.current == id) return
        loadComments()
        ref.current = id
    }, [id])
    return (
        <>
            <div className="m-2 flex flex-col justify-center items-center">
                <CommentInput id={id} onRefresh={loadComments} />
                {error &&
                    <>
                        <div className="flex flex-col wauto rounded-2xl bg-w t-primary m-2 p-6 items-center justify-center">
                            <h1 className="text-xl font-bold t-primary">
                                {error}
                            </h1>
                            <button className="mt-2 bg-theme text-white px-4 py-2 rounded-full" onClick={loadComments}>
                                重新加载
                            </button>
                        </div>
                    </>
                }
                {comments.length > 0 &&
                    <div className="w-full">
                        {comments.map(comment => (
                            <CommentItem key={comment.id} comment={comment} onRefresh={loadComments} />
                        ))}
                    </div>
                }
            </div>
        </>
    )
}

function CommentItem({ comment, onRefresh }: { comment: Comment, onRefresh: () => void }) {
    const profile = useContext(ProfileContext);
    function deleteComment() {
        // 询问
        if (!confirm("确定要删除这条评论吗？")) return
        client.comment({ id: comment.id }).delete(null, {
            headers: headersWithAuth()
        }).then(({ error }: { error?: { value: string } }) => {
            if (error) {
                alert(error.value)
            } else {
                alert("删除成功")
                onRefresh()
            }
        })
    }
    return (
        <div className="flex flex-row items-start rounded-xl mt-2">
            <img src={comment.user.avatar || ''} className="w-8 h-8 rounded-full mt-4" />
            <div className="flex flex-col flex-1 w-0 ml-2 bg-w rounded-xl p-4">
                <div className="flex flex-row">
                    <span className="t-primary text-base font-bold">
                        {comment.user.username}
                    </span>
                    <div className="flex-1 w-0" />
                    <span title={new Date(comment.createdAt).toLocaleString()} className="text-gray-400 text-sm">
                        {format(comment.createdAt)}
                    </span>
                </div>
                <p className="t-primary break-words">
                    {comment.content}
                </p>
                <div className="flex flex-row justify-end">
                    {(profile?.permission || profile?.id == comment.user.id) &&
                        <Popup arrow={false} trigger={
                            <button className="px-2 py bg-secondary rounded-full">
                                <i className="ri-more-fill t-secondary"></i>
                            </button>
                        } position="left center">
                            <div className="flex flex-row self-end mr-2">
                                <button onClick={deleteComment} aria-label="删除评论" className="px-2 py bg-secondary rounded-full">
                                    <i className="ri-delete-bin-2-line t-secondary"></i>
                                </button>
                            </div>
                        </Popup>
                    }
                </div>
            </div>
        </div>)
}
