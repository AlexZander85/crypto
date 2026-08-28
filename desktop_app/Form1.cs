using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace CryptoNavigator
{
    public class Form1 : Form
    {
        // Win32 API: SetWindowDisplayAffinity
        // WDA_MONITOR = 0x00000001 (Turns window black in screen captures/OBS/Discord/Snipping tool)
        // WDA_EXCLUDEFROMCAPTURE = 0x00000011 (Completely hides window from screen capture in Windows 10 2004+)
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        private const uint WDA_MONITOR = 0x00000001;
        private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

        private WebView2? webView;
        private byte[]? htmlBytes;

        // AES-256 Decryption Key & IV
        private static readonly byte[] AesKey = new byte[] { 122, 89, 163, 141, 213, 149, 117, 152, 240, 63, 159, 136, 1, 146, 172, 36, 215, 147, 107, 1, 203, 240, 154, 30, 116, 103, 226, 116, 86, 153, 155, 41 };
        private static readonly byte[] AesIV = new byte[] { 88, 58, 110, 56, 83, 163, 34, 112, 169, 65, 196, 38, 77, 86, 240, 219 };

        public Form1()
        {
            InitializeComponent();
            SetupFormAppearance();
            LoadAndDecryptEmbeddedHtml();
            InitializeWebViewAsync();
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            EnableAntiScreenCapture();
        }

        private void EnableAntiScreenCapture()
        {
            try
            {
                // Try modern Windows 10/11 WDA_EXCLUDEFROMCAPTURE
                if (!SetWindowDisplayAffinity(this.Handle, WDA_EXCLUDEFROMCAPTURE))
                {
                    // Fallback to WDA_MONITOR (Blackout screen capture)
                    SetWindowDisplayAffinity(this.Handle, WDA_MONITOR);
                }
            }
            catch
            {
                // Ignored if OS doesn't support affinity
            }
        }

        private void InitializeComponent()
        {
            this.SuspendLayout();
            this.ClientSize = new System.Drawing.Size(1300, 860);
            this.Name = "CryptoNavigatorForm";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "КриптоНавигатор — Академия Квант-Трейдинга и Риск-Инженерии";
            this.BackColor = System.Drawing.Color.FromArgb(11, 15, 25);
            this.ResumeLayout(false);
        }

        private void SetupFormAppearance()
        {
            this.MinimumSize = new System.Drawing.Size(1024, 700);
            this.WindowState = FormWindowState.Normal;
        }

        private void LoadAndDecryptEmbeddedHtml()
        {
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("CryptoNavigator.Resources.app.enc");
            if (stream == null)
            {
                MessageBox.Show("Ошибка: зашифрованные ресурсы приложения не найдены.", "Ошибка безопасности", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            using var msEncrypted = new MemoryStream();
            stream.CopyTo(msEncrypted);
            byte[] encryptedBytes = msEncrypted.ToArray();

            // In-memory AES-256-CBC Decryption
            using var aes = Aes.Create();
            aes.Key = AesKey;
            aes.IV = AesIV;
            aes.Padding = PaddingMode.PKCS7;

            using var decryptor = aes.CreateDecryptor();
            using var msDecrypted = new MemoryStream();
            using (var cs = new CryptoStream(msDecrypted, decryptor, CryptoStreamMode.Write))
            {
                cs.Write(encryptedBytes, 0, encryptedBytes.Length);
                cs.FlushFinalBlock();
            }

            byte[] compressedBytes = msDecrypted.ToArray();

            // In-memory GZip decompression
            using var msCompressed = new MemoryStream(compressedBytes);
            using var gz = new GZipStream(msCompressed, CompressionMode.Decompress);
            using var msFinal = new MemoryStream();
            gz.CopyTo(msFinal);
            htmlBytes = msFinal.ToArray();
        }

        private async void InitializeWebViewAsync()
        {
            webView = new WebView2
            {
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = System.Drawing.Color.FromArgb(11, 15, 25)
            };
            this.Controls.Add(webView);

            // Configure local user data folder in LocalAppData for persistent progress
            string userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CryptoNavigator", "Data");
            Directory.CreateDirectory(userDataFolder);

            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await webView.EnsureCoreWebView2Async(env);

            // ==========================================
            // HARDWARE-LEVEL SECURITY LOCKS (WEBVIEW2)
            // ==========================================
            var s = webView.CoreWebView2.Settings;
            s.AreDevToolsEnabled = false;
            s.AreDefaultContextMenusEnabled = false;
            s.IsStatusBarEnabled = false;
            s.AreBrowserAcceleratorKeysEnabled = false;
            s.IsZoomControlEnabled = true;
            s.IsBuiltInErrorPageEnabled = false;

            // Handle custom local protocol https://app.local/
            webView.CoreWebView2.AddWebResourceRequestedFilter("https://app.local/*", CoreWebView2WebResourceContext.All);
            webView.CoreWebView2.WebResourceRequested += CoreWebView2_WebResourceRequested;

            // Prevent opening external windows or navigating away
            webView.CoreWebView2.NewWindowRequested += (sender, args) =>
            {
                args.Handled = true;
                if (!string.IsNullOrEmpty(args.Uri) && (args.Uri.StartsWith("http://") || args.Uri.StartsWith("https://")))
                {
                    try
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = args.Uri,
                            UseShellExecute = true
                        });
                    }
                    catch { }
                }
            };

            // Navigate to secure in-memory application
            webView.CoreWebView2.Navigate("https://app.local/index.html");
        }

        private void CoreWebView2_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
        {
            if (e.Request.Uri.StartsWith("https://app.local/index.html") || e.Request.Uri == "https://app.local/")
            {
                if (htmlBytes != null)
                {
                    var stream = new MemoryStream(htmlBytes);
                    e.Response = webView!.CoreWebView2.Environment.CreateWebResourceResponse(
                        stream,
                        200,
                        "OK",
                        "Content-Type: text/html; charset=utf-8\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff"
                    );
                }
            }
        }
    }
}
