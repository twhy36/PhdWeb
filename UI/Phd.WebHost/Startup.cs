using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Rewrite;

namespace Phd.WebHost
{
    public class Startup
    {
        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddSpaStaticFiles(config =>
            {
                config.RootPath = "dist";
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            var rewriteOptions = new RewriteOptions();
            rewriteOptions.AddRedirectToHttpsPermanent();
            rewriteOptions.AddRedirect(@"^$", "/salesportal/index.html");
            app.UseRewriter(rewriteOptions);

            app.UseStaticFiles();
            app.UseSpaStaticFiles();
            app.Map("/designtool", app1 =>
            {
                app1.UseSpa(spa =>
                 {
                     spa.Options.DefaultPage = "/designtool/index.html";
                 });
            });

            app.Map("/choiceadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/choiceadmin/index.html";
                });
            });

            app.Map("/salesadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesadmin/index.html";
                });
            });

            app.Map("/salesportal", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesportal/index.html";
                });
            });
        }
    }
}
