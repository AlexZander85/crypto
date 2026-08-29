# tools/build_desktop_exe.py
import os
import gzip
import re
import subprocess
import shutil
import hashlib
import base64
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

ROOT = r'D:\crypto'
SRC_HTML = os.path.join(ROOT, 'index.html')
APP_DIR = os.path.join(ROOT, 'desktop_app')
RES_DIR = os.path.join(APP_DIR, 'Resources')
DIST_DIR = os.path.join(ROOT, 'dist')

os.makedirs(RES_DIR, exist_ok=True)
os.makedirs(DIST_DIR, exist_ok=True)

# Remove Form1.Designer.cs if exists
designer_cs = os.path.join(APP_DIR, 'Form1.Designer.cs')
if os.path.exists(designer_cs):
    os.remove(designer_cs)

# 1. Read index.html and inject Anti-Tamper, Anti-Copy, Anti-Debug scripts
print("1. Reading index.html and injecting Anti-Tamper & Anti-Copy layers...")
with open(SRC_HTML, 'r', encoding='utf-8') as f:
    html = f.read()

protection_css_and_js = """
<style id="anti_copy_protection">
  *, *::before, *::after {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
  }
  input, textarea, select, [contenteditable="true"] {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }
</style>
<script id="anti_tamper_shield">
  (function(){
    // Anti-Debug loop
    setInterval(function(){
      var t0 = Date.now();
      debugger;
      if (Date.now() - t0 > 100) {
        document.body.innerHTML = '<div style="color:red;padding:40px;font-family:sans-serif;text-align:center"><h2>Внимание</h2>Обнаружена попытка отладки. Доступ заблокирован.</div>';
      }
    }, 1000);

    // Disable right-click context menu
    document.addEventListener('contextmenu', function(e){
      e.preventDefault();
      return false;
    }, true);

    // Clear clipboard on any copy / cut attempt
    document.addEventListener('copy', function(e){
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.clipboardData.setData('text/plain', '');
        e.preventDefault();
        return false;
      }
    }, true);

    document.addEventListener('cut', function(e){
      if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        return false;
      }
    }, true);

    // Disable drag & drop text
    document.addEventListener('dragstart', function(e){
      e.preventDefault();
      return false;
    }, true);

    // Block keyboard shortcuts (F12, Ctrl+U, Ctrl+S, Ctrl+P, Ctrl+C, Ctrl+A, Ctrl+Shift+I/J/C, PrintScreen)
    window.addEventListener('keydown', function(e){
      if (e.keyCode === 123 || e.key === 'F12' || e.keyCode === 44 || e.key === 'PrintScreen') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      if (e.ctrlKey || e.metaKey) {
        var k = e.key ? e.key.toLowerCase() : '';
        if (k === 'u' || k === 's' || k === 'p' || (k === 'c' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') || (k === 'a' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') || (e.shiftKey && (k === 'i' || k === 'j' || k === 'c'))) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    }, true);
  })();
</script>
"""

if '<head>' in html:
    html_protected = html.replace('<head>', '<head>' + protection_css_and_js)
else:
    html_protected = protection_css_and_js + html

# 2. Compress with GZip first
raw_bytes = html_protected.encode('utf-8')
compressed_bytes = gzip.compress(raw_bytes, compresslevel=9)

# 3. Encrypt payload with AES-256-CBC
# Generate fixed deterministic encryption keys derived from project signature
key = hashlib.sha256(b"CryptoNavigator_Quantum_Secure_Shield_2026_AES256").digest() # 32 bytes (256-bit)
iv = hashlib.md5(b"CryptoNavigator_IV_Key_Salt_2026").digest() # 16 bytes (128-bit)

# AES CBC padding (PKCS7)
pad_len = 16 - (len(compressed_bytes) % 16)
padded_data = compressed_bytes + bytes([pad_len] * pad_len)

cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
encryptor = cipher.encryptor()
encrypted_payload = encryptor.update(padded_data) + encryptor.finalize()

enc_path = os.path.join(RES_DIR, 'app.enc')
with open(enc_path, 'wb') as f_out:
    f_out.write(encrypted_payload)

enc_size_kb = len(encrypted_payload) / 1024
print(f"2. Encrypted application with AES-256 into Resources/app.enc ({enc_size_kb:.1f} KB)")

# Key arrays for C# code injection
key_csharp = "new byte[] { " + ", ".join([str(b) for b in key]) + " }"
iv_csharp = "new byte[] { " + ", ".join([str(b) for b in iv]) + " }"

# 4. Write CryptoNavigator.csproj
csproj_content = """<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <UseWindowsForms>true</UseWindowsForms>
    <ImplicitUsings>enable</ImplicitUsings>
    <ApplicationTitle>КриптоНавигатор</ApplicationTitle>
    <AssemblyName>CryptoNavigator</AssemblyName>
    <RootNamespace>CryptoNavigator</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Web.WebView2" Version="1.0.4191.47" />
  </ItemGroup>

  <ItemGroup>
    <EmbeddedResource Include="Resources\\app.enc" />
  </ItemGroup>

</Project>
"""
with open(os.path.join(APP_DIR, 'CryptoNavigator.csproj'), 'w', encoding='utf-8') as f:
    f.write(csproj_content)

# 5. Write Form1.cs with Win32 SetWindowDisplayAffinity (Anti-Screenshot & Anti-Screen-Record) + AES-256 Decryption
form_cs_content = f"""using System;
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
{{
    public class Form1 : Form
    {{
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
        private static readonly byte[] AesKey = {key_csharp};
        private static readonly byte[] AesIV = {iv_csharp};

        public Form1()
        {{
            InitializeComponent();
            SetupFormAppearance();
            LoadAndDecryptEmbeddedHtml();
            InitializeWebViewAsync();
        }}

        protected override void OnHandleCreated(EventArgs e)
        {{
            base.OnHandleCreated(e);
            EnableAntiScreenCapture();
        }}

        private void EnableAntiScreenCapture()
        {{
            try
            {{
                // Try modern Windows 10/11 WDA_EXCLUDEFROMCAPTURE
                if (!SetWindowDisplayAffinity(this.Handle, WDA_EXCLUDEFROMCAPTURE))
                {{
                    // Fallback to WDA_MONITOR (Blackout screen capture)
                    SetWindowDisplayAffinity(this.Handle, WDA_MONITOR);
                }}
            }}
            catch
            {{
                // Ignored if OS doesn't support affinity
            }}
        }}

        private void InitializeComponent()
        {{
            this.SuspendLayout();
            this.ClientSize = new System.Drawing.Size(1300, 860);
            this.Name = "CryptoNavigatorForm";
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Text = "КриптоНавигатор — Академия Квант-Трейдинга и Риск-Инженерии";
            this.BackColor = System.Drawing.Color.FromArgb(11, 15, 25);
            this.ResumeLayout(false);
        }}

        private void SetupFormAppearance()
        {{
            this.MinimumSize = new System.Drawing.Size(1024, 700);
            this.WindowState = FormWindowState.Normal;
        }}

        private void LoadAndDecryptEmbeddedHtml()
        {{
            var assembly = Assembly.GetExecutingAssembly();
            using var stream = assembly.GetManifestResourceStream("CryptoNavigator.Resources.app.enc");
            if (stream == null)
            {{
                MessageBox.Show("Ошибка: зашифрованные ресурсы приложения не найдены.", "Ошибка безопасности", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }}

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
            {{
                cs.Write(encryptedBytes, 0, encryptedBytes.Length);
                cs.FlushFinalBlock();
            }}

            byte[] compressedBytes = msDecrypted.ToArray();

            // In-memory GZip decompression
            using var msCompressed = new MemoryStream(compressedBytes);
            using var gz = new GZipStream(msCompressed, CompressionMode.Decompress);
            using var msFinal = new MemoryStream();
            gz.CopyTo(msFinal);
            htmlBytes = msFinal.ToArray();
        }}

        private async void InitializeWebViewAsync()
        {{
            webView = new WebView2
            {{
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = System.Drawing.Color.FromArgb(11, 15, 25)
            }};
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
            {{
                args.Handled = true;
                if (!string.IsNullOrEmpty(args.Uri) && (args.Uri.StartsWith("http://") || args.Uri.StartsWith("https://")))
                {{
                    try
                    {{
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {{
                            FileName = args.Uri,
                            UseShellExecute = true
                        }});
                    }}
                    catch {{ }}
                }}
            }};

            // Navigate to secure in-memory application
            webView.CoreWebView2.Navigate("https://app.local/index.html");
        }}

        private void CoreWebView2_WebResourceRequested(object? sender, CoreWebView2WebResourceRequestedEventArgs e)
        {{
            if (e.Request.Uri.StartsWith("https://app.local/index.html") || e.Request.Uri == "https://app.local/")
            {{
                if (htmlBytes != null)
                {{
                    var stream = new MemoryStream(htmlBytes);
                    e.Response = webView!.CoreWebView2.Environment.CreateWebResourceResponse(
                        stream,
                        200,
                        "OK",
                        "Content-Type: text/html; charset=utf-8\\r\\nCache-Control: no-cache\\r\\nX-Content-Type-Options: nosniff"
                    );
                }}
            }}
        }}
    }}
}}
"""
with open(os.path.join(APP_DIR, 'Form1.cs'), 'w', encoding='utf-8') as f:
    f.write(form_cs_content)

# 6. Publish Self-Contained Standalone Executable
print("3. Compiling Standalone Self-Contained CryptoNavigator.exe with AES-256 & DRM Display Affinity...")
cmd = [
    "dotnet", "publish",
    os.path.join(APP_DIR, "CryptoNavigator.csproj"),
    "-c", "Release",
    "-r", "win-x64",
    "--self-contained", "true",
    "-p:PublishSingleFile=true",
    "-p:IncludeNativeLibrariesForSelfExtract=true",
    "-p:EnableCompressionInSingleFile=true",
    "-o", DIST_DIR
]
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("BUILD ERROR:", res.stderr)
else:
    for f in os.listdir(DIST_DIR):
        if f.endswith('.xml') or f.endswith('.pdb'):
            try:
                os.remove(os.path.join(DIST_DIR, f))
            except Exception:
                pass

    exe_path = os.path.join(DIST_DIR, 'CryptoNavigator.exe')
    if os.path.exists(exe_path):
        size_mb = os.path.getsize(exe_path) / (1024 * 1024)
        print(f"SUCCESS! AES-256 Encrypted & DRM Protected Executable built: {exe_path} ({size_mb:.2f} MB)")
