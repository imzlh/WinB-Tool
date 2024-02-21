/**
 * WinB Default Package
 * @copyright WinBAuthor
 */
console.log('Hello world.');
this.createWindow({
    x: 100,
    y: 100,
    width: 800,
    height: 500,
    display: 'normal',
    title: "WinB示例应用",
    name: 'test-app',
    icon: this.getUrl('/icon.webp'),
    content: `<style>
        ._winb_h::after {
            position: absolute;
            bottom: -1rem;
            left: 20rem;
            display: block;
            content: '';
            width: 10rem;
            height: .5rem;
            border-radius: .25rem;
            /background-image: linear-gradient(45deg, #582ab8,#1866a2, transparent);
            animation: _winb_fade 2s forwards;
        }
        
        @keyframes _winb_fade{
            from{
                left: 20rem;
                opacity: .5;
            }to{
                left: -1rem;
                opacity: 1;
            }
        }
        </style>
        <div class="__moveable_head" style="background-image: /* linear-gradient(135deg, #7d61e0, #47b0a7) */url('${this.getUrl('/bg.webp')}');background-position: center;background-size: cover;inset: 0;position: absolute;display: flex;flex-direction: column;justify-content: center;align-items: center;margin: 0;overflow: hidden;font-family: Inter,sans-serif;color: #ed91d9;">
            <div style="font-size: 2.25rem;letter-spacing: 0.25rem;position: relative;" class="_winb_h">欢迎加入WinB的世界！</div>
            <p style="line-height: 1.75rem;margin: 2rem 0;">
                这是一个默认界面，你可以任意修改<br>
                关于原生应用开发流程和技巧，请参考
                <a href="https://winb.imzlh.top/docs/#/app/index.md" style="color: #dcd4a2;text-decoration: none;text-shadow: 0 0 1rem #798135;margin: 0 .25rem;">官网文档</a>
            </p>
        </div>`,
    event:{
        close: () => console.log('Exit')
    }
});
_G('system.ui.message').call({
    type:'info',
    title:'欢迎使用WinB',
    content:{
        content:'想知道如何开发吗',
        title:'官网有教程哦'
    },
    handle(){
        window.open('https://winb.imzlh.top/docs/#/app/index.md');
    }
});
setTimeout(() => this.alert({
    title: '欢迎',
    content: '今天你WinB了吗',
    type: 'info',
    btns: [
        {
            "content":"当然",
            "handle":(self) => self('close')
        },{
            "content":"没有",
            "handle":(self1) =>  this.alert({
                    title: '怎么可以这样',
                    content: '记得今天WinB一下哦',
                    type: 'error',
                    btns: [
                        {
                            "content":"好",
                            "handle":(self) => {
                                self('close');self1('close')
                            }
                        }
                    ]
                })
        }
    ]
}))