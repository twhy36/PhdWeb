using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.AspNetCore.SpaServices;

namespace Phd.WebHost
{
    public class Startup
    {
        private StaticFileOptions NoCacheStaticFileOptions => new StaticFileOptions
        {
            OnPrepareResponse = ctx =>
            {
                var headers = ctx.Context.Response.GetTypedHeaders();
                headers.CacheControl = new Microsoft.Net.Http.Headers.CacheControlHeaderValue
                {
                    Public = true,
                    MaxAge = TimeSpan.FromDays(0)
                };
            }
        };

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
                     spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                 });
            });

            app.Map("/choiceadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/choiceadmin/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/salesadmin", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesadmin/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/salesportal", app1 =>
            {
                app1.UseSpa(spa =>
                {
                    spa.Options.DefaultPage = "/salesportal/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });

            app.Map("/homedesigner", app1 => 
            {
                app1.UseSpa(spa => 
                {
                    spa.Options.DefaultPage = "/homedesigner/index.html";
                    spa.Options.DefaultPageStaticFileOptions = NoCacheStaticFileOptions;
                });
            });
        }
    }
}
